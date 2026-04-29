using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

public enum ApiErrorKind
{
    None,
    Network,
    Timeout,
    Http,
    Aborted,
    DataProcessing,
    Deserialization,
    Unknown
}

[Serializable]
public class ApiError
{
    public ApiErrorKind kind;
    public string message;
    public long statusCode;
    public string url;
    public string rawBody;

    public override string ToString()
        => $"[{kind}] {(statusCode != 0 ? $"HTTP {statusCode} - " : "")}{message}";
}

[Serializable]
public class ApiResult<T>
{
    public bool ok;
    public long statusCode;
    public T data;
    public ApiError error;

    public static ApiResult<T> Success(T data, long statusCode) =>
        new ApiResult<T> { ok = true, data = data, statusCode = statusCode };

    public static ApiResult<T> Fail(ApiError error, long statusCode = 0) =>
        new ApiResult<T> { ok = false, error = error, statusCode = statusCode };
}

public class ApiClient
{
    private readonly string _baseUrl;
    private readonly Func<string> _bearerTokenProvider;
    private readonly Dictionary<string, string> _defaultHeaders = new();

    public ApiClient(string baseUrl, Func<string> bearerTokenProvider = null)
    {
        _baseUrl = baseUrl?.TrimEnd('/');
        _bearerTokenProvider = bearerTokenProvider;
        _defaultHeaders["Accept"] = "application/json";
    }

    public void SetDefaultHeader(string key, string value) => _defaultHeaders[key] = value;

    public Task<ApiResult<TRes>> GetJson<TRes>(string path, Dictionary<string, string> query = null, int timeoutSeconds = 15, CancellationToken ct = default)
        => SendJson<TRes>("GET", BuildUrl(path, query), null, timeoutSeconds, ct);

    public Task<ApiResult<TRes>> PostJson<TReq, TRes>(string path, TReq body, int timeoutSeconds = 15, CancellationToken ct = default)
        => SendJson<TRes>("POST", BuildUrl(path), body, timeoutSeconds, ct);

    public Task<ApiResult<TRes>> PutJson<TReq, TRes>(string path, TReq body, int timeoutSeconds = 15, CancellationToken ct = default)
        => SendJson<TRes>("PUT", BuildUrl(path), body, timeoutSeconds, ct);

    public Task<ApiResult<TRes>> DeleteJson<TRes>(string path, int timeoutSeconds = 15, CancellationToken ct = default)
        => SendJson<TRes>("DELETE", BuildUrl(path), null, timeoutSeconds, ct);

    private async Task<ApiResult<TRes>> SendJson<TRes>(
        string method,
        string url,
        object bodyObj,
        int timeoutSeconds,
        CancellationToken ct)
    {
        using var req = new UnityWebRequest(url, method);
        req.downloadHandler = new DownloadHandlerBuffer();
        req.timeout = timeoutSeconds; 

        foreach (var kv in _defaultHeaders)
            req.SetRequestHeader(kv.Key, kv.Value);

        var token = _bearerTokenProvider?.Invoke();
        if (!string.IsNullOrWhiteSpace(token))
            req.SetRequestHeader("Authorization", $"Bearer {token}");

        if (bodyObj != null)
        {
            var json = JsonUtility.ToJson(bodyObj);
            var bytes = Encoding.UTF8.GetBytes(json);
            req.uploadHandler = new UploadHandlerRaw(bytes);
            req.SetRequestHeader("Content-Type", "application/json");
        }

        UnityWebRequestAsyncOperation op;
        try
        {
            op = req.SendWebRequest(); 
        }
        catch (Exception e)
        {
            return ApiResult<TRes>.Fail(new ApiError {
                kind = ApiErrorKind.Unknown,
                message = $"Errore nell’avvio della request: {e.Message}",
                url = url
            });
        }

        while (!op.isDone)
        {
            if (ct.IsCancellationRequested)
            {
                req.Abort();
                return ApiResult<TRes>.Fail(new ApiError { kind = ApiErrorKind.Aborted, message = "Richiesta annullata.", url = url });
            }
            await Task.Yield();
        }

        var status = req.responseCode;
        var raw = req.downloadHandler?.text;

        if (req.result == UnityWebRequest.Result.Success)
        {
            if (typeof(TRes) == typeof(string))
                return ApiResult<TRes>.Success((TRes)(object)(raw ?? ""), status);

            try
            {
                var data = JsonUtility.FromJson<TRes>(raw);
                return ApiResult<TRes>.Success(data, status);
            }
            catch (Exception e)
            {
                return ApiResult<TRes>.Fail(new ApiError {
                    kind = ApiErrorKind.Deserialization,
                    message = $"Parsing JSON fallito: {e.Message}",
                    statusCode = status,
                    url = url,
                    rawBody = raw
                }, status);
            }
        }

        return ApiResult<TRes>.Fail(BuildError(req, url, raw), status);
    }
    
    private static ApiError BuildError(UnityWebRequest req, string url, string raw)
    {
        var msg = req.error ?? "Errore sconosciuto.";
        var status = req.responseCode;

        if (!string.IsNullOrEmpty(msg) && msg.IndexOf("timeout", StringComparison.OrdinalIgnoreCase) >= 0)
            return new ApiError { kind = ApiErrorKind.Timeout, message = "Timeout.", statusCode = status, url = url };

        return new ApiError {
            kind = ApiErrorKind.Network,
            message = $"{msg} (Code: {status})",
            statusCode = status,
            url = url,
            rawBody = raw
        };
    }

    private string BuildUrl(string path, Dictionary<string, string> query = null)
    {
        var p = path.StartsWith("/") ? path : "/" + path;
        var url = string.IsNullOrEmpty(_baseUrl) ? p : (_baseUrl + p);

        if (query == null || query.Count == 0) return url;

        var sb = new StringBuilder(url);
        sb.Append('?');
        bool first = true;
        foreach (var kv in query)
        {
            if (!first) sb.Append('&');
            first = false;
            sb.Append(UnityWebRequest.EscapeURL(kv.Key));
            sb.Append('=');
            sb.Append(UnityWebRequest.EscapeURL(kv.Value ?? ""));
        }
        return sb.ToString();
    }
}