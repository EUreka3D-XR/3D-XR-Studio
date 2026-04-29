using UnityEngine;
using UnityEngine.UI;
using TMPro;

[ExecuteAlways]
public class AlignImageToText : MonoBehaviour
{
    [Header("Riferimenti")]
    public TextMeshProUGUI textComponent;
    public RectTransform imageRectTransform;

    [Header("Distanza dal testo")]
    public float padding = 5f;

    RectTransform textRect;

    void Awake()
    {
        if (textComponent == null)
            textComponent = GetComponentInChildren<TextMeshProUGUI>();
        textRect = textComponent.rectTransform;
    }

    void OnEnable()
    {
        TMPro_EventManager.TEXT_CHANGED_EVENT.Add(OnAnyTMPTextChanged);
        UpdateImagePosition();
    }

    void OnDisable()
    {
        TMPro_EventManager.TEXT_CHANGED_EVENT.Remove(OnAnyTMPTextChanged);
    }

    void OnAnyTMPTextChanged(UnityEngine.Object obj)
    {
        if (obj == textComponent)
            UpdateImagePosition();
    }

    void UpdateImagePosition()
    {
        LayoutRebuilder.ForceRebuildLayoutImmediate(textRect);

        float textWidth = textComponent.preferredWidth;
        Vector2 pos = imageRectTransform.anchoredPosition;
        pos.x = textWidth + padding;
        imageRectTransform.anchoredPosition = pos;
    }

    void Update()
    {
#if UNITY_EDITOR
        UpdateImagePosition();
#endif
    }
}