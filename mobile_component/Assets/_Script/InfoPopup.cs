using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class InfoPopup : MonoBehaviour
{
    [Header("Refs")]
    [SerializeField] GameObject root;
    [SerializeField] RawImage photoRaw;
    [SerializeField] private Texture2D basePhotoTexture;
    [SerializeField] TMP_Text titleText;
    [SerializeField] TMP_Text bodyText;
    
    public void Show( string title, string body, Texture2D tex = null)
    {
        root.SetActive(true);
        titleText.text = title;
        bodyText.text = body;
        SetTexture(tex == null ? basePhotoTexture : tex);
    }
    
    private void SetTexture(Texture2D t)
    {
        if (!photoRaw) return;
        photoRaw.texture = t;
        var fitter = photoRaw.GetComponent<AspectRatioFitter>();
        if (fitter && t) fitter.aspectRatio = (float)t.width / t.height;
        Stretch(photoRaw.rectTransform);
    }
    
    private static void Stretch(RectTransform rt)
    {
        rt.anchorMin = Vector2.zero;
        rt.anchorMax = Vector2.one;
        rt.offsetMin = Vector2.zero;
        rt.offsetMax = Vector2.zero;
    }
}