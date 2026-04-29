using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

public class Scene_KeepAttentionAR : MonoBehaviour
{
    private IEnumerator Start()
    {
        yield return new WaitForSeconds(4f);
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex + 1); 
    }
}
