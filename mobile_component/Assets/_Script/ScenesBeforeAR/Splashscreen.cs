using System.Collections;
using UnityEngine;
using UnityEngine.Localization.Settings;
using UnityEngine.SceneManagement;

public class Splashscreen : MonoBehaviour
{
    [SerializeField] private Animator _animator;
    
    private IEnumerator Start()
    {
        yield return new WaitUntil(() =>
        {
            AnimatorStateInfo info = _animator.GetCurrentAnimatorStateInfo(0);
            return !_animator.IsInTransition(0) && info.normalizedTime >= 1f;
        });

        string folderPathToCheckAndCreate = Application.persistentDataPath + "image";
        if (!System.IO.Directory.Exists(folderPathToCheckAndCreate))
            System.IO.Directory.CreateDirectory(folderPathToCheckAndCreate);
        
        folderPathToCheckAndCreate = Application.persistentDataPath + "audio";
        if (!System.IO.Directory.Exists(folderPathToCheckAndCreate))
            System.IO.Directory.CreateDirectory(folderPathToCheckAndCreate);
        
        folderPathToCheckAndCreate = Application.persistentDataPath + "video";
        if (!System.IO.Directory.Exists(folderPathToCheckAndCreate))
            System.IO.Directory.CreateDirectory(folderPathToCheckAndCreate);
        
        yield return new WaitForSeconds(1f);
        
        string savedCode = SelectLanguage.GetSavedLocaleCode();
        if (string.IsNullOrEmpty(savedCode))
        {
            loadSelectLanguageScene();
        }
        else
        {
            var locale = LocalizationSettings.AvailableLocales.Locales
                .Find(l => l.Identifier.Code == savedCode);
            
            if (locale != null)
                LocalizationSettings.SelectedLocale = locale;
            loadSelectVisitorOrCuratorScene(); 
        }
    }
    
    public static void loadSelectLanguageScene()
    {
        SceneManager.LoadScene("1_SelectLanguage");
    }
    
    public static void loadSelectVisitorOrCuratorScene()
    {
        SceneManager.LoadScene("2_VisitorOrCurator");
    }
    
    public static void loadQrScene()
    {
        SceneManager.LoadScene("3_QRReader");
    }
    
    public static void loadKeepAttentionArScene()
    {
        SceneManager.LoadScene("4_KeepAttentionAR");
    }
}