using System.Collections;
using UnityEngine;
using TMPro;
using UnityEngine.Localization;

[RequireComponent(typeof(TMP_Text))]
public class LoadingTextAnimator : MonoBehaviour
{
    [Header("Settings")]
    public LocalizedString localizedBaseText;
    private const float animationDelay = 0.3f;
    private const int maxDots = 3;

    private TMP_Text textComponent;
    private string baseString = "";
    private Coroutine animationCoroutine;

    void Awake()
    {
        textComponent = GetComponent<TMP_Text>();
    }

    void OnEnable()
    {
        localizedBaseText.StringChanged += UpdateBaseString;
        
        animationCoroutine = StartCoroutine(AnimateDots());
    }

    void OnDisable()
    {
        localizedBaseText.StringChanged -= UpdateBaseString;
        
        if (animationCoroutine != null)
        {
            StopCoroutine(animationCoroutine);
        }
    }

    private void UpdateBaseString(string translatedText)
    {
        baseString = translatedText;
    }

    private IEnumerator AnimateDots()
    {
        int dotCount = 0;

        while (true)
        {
            if (!string.IsNullOrEmpty(baseString))
            {
                string dots = new string('.', dotCount);
                textComponent.text = baseString + dots;
            }
            
            dotCount = (dotCount + 1) % (maxDots + 1);
            
            yield return new WaitForSeconds(animationDelay);
        }
    }
}