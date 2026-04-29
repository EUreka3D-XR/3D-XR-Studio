using System;
using System.Threading.Tasks;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LoginAsAdminSceneManager : MonoBehaviour
{
    [Header("UI")]
    [SerializeField] private TMP_InputField _usernameField;
    [SerializeField] private TMP_InputField _passwordField;
    [SerializeField] private Button _loginButton;
    [SerializeField] private GameObject errorLoginGO;
    [SerializeField] private TMP_Text _errorText;

    [Header("Password toggle")]
    [SerializeField] private Image showHidePasswordButton;
    [SerializeField] private Sprite eye_Open;
    [SerializeField] private Sprite eye_Closed;

    private bool showPassword = false;
    
    public string error_401;
    public string error_500;
    public string error_0;
    public string error_default;
    public string error_1;
    public string error_2;
    public string error_initial;
    
    private const string RoleKey = "RoleKey";
    
    [Serializable]
    public class LoginRequest 
    { 
        public string username; 
        public string password; 
    }

    [Serializable]
    public class AuthResponse 
    { 
        public string token; 
        public string role; 
    }

    private void Awake()
    {
        setCorrectErrorTexts();
    }

    private async void setCorrectErrorTexts()
    {
       error_401 = await SelectLanguage.setSingleStringLocalized("UI", "401");
       error_500 = await SelectLanguage.setSingleStringLocalized("UI", "500");
       error_0 = await SelectLanguage.setSingleStringLocalized("UI", "0");
       error_default = await SelectLanguage.setSingleStringLocalized("UI", "Default");
       error_1  = await SelectLanguage.setSingleStringLocalized("UI", "Error1");
       error_2 = await SelectLanguage.setSingleStringLocalized("UI", "Error2");
       error_initial = await SelectLanguage.setSingleStringLocalized("UI", "ErrorInitial");
    }

    private void Start()
    {
        showPassword = false;
        if (errorLoginGO) errorLoginGO.SetActive(false);
        if (showHidePasswordButton) showHidePasswordButton.sprite = eye_Closed;
        if (_passwordField) _passwordField.contentType = TMP_InputField.ContentType.Password;
        if (_loginButton) _loginButton.onClick.AddListener(OnLoginClicked);
    }

    private void OnDestroy()
    {
        if (_loginButton) _loginButton.onClick.RemoveListener(OnLoginClicked);
    }

    public void backToSelectVisitorOrAdmin()
    {
        Splashscreen.loadSelectVisitorOrCuratorScene();
    }
    
    public void checkAdminCredentialsAndGoToNextScene()
    {
        OnLoginClicked();
    }
    
    private async void OnLoginClicked()
    {
        await PerformLogin();
    }
    
    private async Task PerformLogin()
    {
        if (_loginButton) _loginButton.interactable = false;
        if (errorLoginGO) errorLoginGO.SetActive(false);

        var username = _usernameField ? _usernameField.text.Trim() : "admin";
        var password = _passwordField ? _passwordField.text : "";

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            ShowError(error_initial);
            if (_loginButton) _loginButton.interactable = true;
            return;
        }

        var payload = new LoginRequest { username = username, password = password };
        
        var result = await Api.Instance.Client.PostJson<LoginRequest, AuthResponse>("auth/login", payload);

        if (result.ok)
        {
            var data = result.data;

            if (string.IsNullOrWhiteSpace(data.token))
            {
                ShowError(error_1);
            }
            else if ((!string.Equals(data.role, "admin", StringComparison.OrdinalIgnoreCase)) &&
                     (!string.Equals(data.role, "editor", StringComparison.OrdinalIgnoreCase)))
            {
                ShowError(error_2);
            }
            else
            {
                Api.Instance.SetStoredToken(data.token);
                PlayerPrefs.SetString(RoleKey, data.role);
                PlayerPrefs.Save();

                Debug.Log($"Login successo. Ruolo: {data.role}");
                Splashscreen.loadQrScene();
            }
        }
        else
        {
            HandleLoginError(result.error);
        }

        if (_loginButton) _loginButton.interactable = true;
    }

    private void HandleLoginError(ApiError error)
    {
        string msg;
        
        switch (error.statusCode)
        {
            case 401:
                msg = error_401;
                break;
            case 500:
                msg = error_500;
                break;
            case 0 when error.kind == ApiErrorKind.Network:
                msg = error_0;
                break;
            default:
                msg = error_default;
                break;
        }
        
        ShowError(msg);
        Debug.LogError($"Login Error: {error}");
    }

    private void ShowError(string msg)
    {
        if (errorLoginGO) errorLoginGO.SetActive(true);

        if (!_errorText && errorLoginGO)
            _errorText = errorLoginGO.GetComponentInChildren<TMP_Text>(true);

        if (_errorText) _errorText.text = msg;
    }

    public void hideOrShowPassword()
    {
        showPassword = !showPassword;
        if (showHidePasswordButton) showHidePasswordButton.sprite = showPassword ? eye_Open : eye_Closed;

        if (_passwordField)
        {
            _passwordField.contentType = showPassword
                ? TMP_InputField.ContentType.Standard
                : TMP_InputField.ContentType.Password;

            _passwordField.ForceLabelUpdate();
        }
    }
}