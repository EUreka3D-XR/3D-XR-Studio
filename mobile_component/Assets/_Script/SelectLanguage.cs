using System.Threading.Tasks;
using TMPro;
using UnityEngine;
using UnityEngine.Localization;
using UnityEngine.Localization.Settings;
using UnityEngine.SceneManagement;

public class SelectLanguage : MonoBehaviour
{
    private const string PrefKey = "selected_locale";
    
    public void SelectLocale(string _localeCode)
    {
        var locale = LocalizationSettings.AvailableLocales.Locales
            .Find(l => l.Identifier.Code == _localeCode);
        
        if (locale == null)
        {
            Debug.LogWarning($"Locale '{_localeCode}' non trovata nelle Available Locales.");
            return;
        }
        
        LocalizationSettings.SelectedLocale = locale;
        
        PlayerPrefs.SetString(PrefKey, _localeCode);
        PlayerPrefs.Save();
        
        if (SceneManager.GetActiveScene().name == "1_SelectLanguage")
            Splashscreen.loadSelectVisitorOrCuratorScene();
        else
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }
    
    public static async Task setLocalizedTextUI(
        TextMeshProUGUI canvasText, string _tableReference, string _firstTableEntryReference, object[] _argumentsFirstEntryRef = null,
        string _secondTableEntryReference = "", object[] _argumentsSecondEntryRef = null, bool spaceBetweenFirstAndSecondString = false,
        string _thirdTableEntryReference = "", object[] _argumentsThirdEntryRef = null, bool spaceBetweenSecondAndThirdString = false
    )
    {
        string firstString = await setSingleStringLocalized(_tableReference, _firstTableEntryReference, _argumentsFirstEntryRef);
        canvasText.text = firstString;
        
        if (_secondTableEntryReference == "")
            return;
        
        if (spaceBetweenFirstAndSecondString)
            firstString += " ";
        
        string secondString = await setSingleStringLocalized(_tableReference, _secondTableEntryReference, _argumentsSecondEntryRef);
        canvasText.text = firstString + secondString;
        
        if (_thirdTableEntryReference == "")
            return;
        
        if (spaceBetweenSecondAndThirdString)
            secondString += " ";
        
        string thirdString = await setSingleStringLocalized(_tableReference, _thirdTableEntryReference, _argumentsThirdEntryRef);
        canvasText.text = firstString + secondString + thirdString;
    }
    
    public static async Task<string> setSingleStringLocalized(string _tableReference, string _tableEntryReference, object[] _argumentsFirstEntryRef = null)
    {
        LocalizedString localization = new LocalizedString
        {
            TableReference = _tableReference,
            TableEntryReference = _tableEntryReference,
        };
    
        if (_argumentsFirstEntryRef != null)
            localization.Arguments = _argumentsFirstEntryRef;
    
        try
        {
            var handle = localization.GetLocalizedStringAsync();
            return await handle.Task;
        }
        catch
        {
            Debug.LogError("Errore nel caricamento della stringa " + _tableEntryReference + " localizzata.");
        }
        return "";
    }
    
    public static string GetSavedLocaleCode() =>
        PlayerPrefs.GetString(PrefKey, string.Empty);
}
