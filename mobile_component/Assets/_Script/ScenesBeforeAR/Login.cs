using UnityEngine;
using UnityEngine.SceneManagement;

public class Login : MonoBehaviour
{
    public static bool logAsAdmin = false;
    
    public void loginAsAdmin()
    {
        logAsAdmin = true;
        SceneManager.LoadScene("LoginAsAdmin");
    }
    
    public void loginAsUser()
    {
        logAsAdmin = false;
        Splashscreen.loadQrScene();
    }
}
