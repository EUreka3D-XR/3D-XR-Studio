using UnityEngine;

public class Api : MonoBehaviour
{
    public static Api Instance { get; private set; }
    public ApiClient Client { get; private set; }
    
    private const string baseUrl = "https://google.com";
    private const string TokenKey = "TokenKey";

    private void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        Client = new ApiClient(baseUrl, () => PlayerPrefs.GetString(TokenKey, ""));
        Client.SetDefaultHeader("X-App-Version", Application.version);
    }
    
    public string GetStoredToken() => PlayerPrefs.GetString(TokenKey, "");
    
    public void SetStoredToken(string token)
    {
        PlayerPrefs.SetString(TokenKey, token);
        PlayerPrefs.Save();
    }
    
    public void ClearStoredToken()
    {
        PlayerPrefs.DeleteKey(TokenKey);
        PlayerPrefs.Save();
    }
}