using UnityEngine;
using UnityEngine.SceneManagement;

public class Scene_SmartphoneCorrectPosition : MonoBehaviour
{
    public void goNextScene()
    {
        Debug.Log("Smartphone Positioned");
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex + 1); 
    }
}
