using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.XR.ARFoundation;

public class PlaneToggleUI : MonoBehaviour
{
    [Header("Scene references")]
    [SerializeField] ARPlaneManager planeManager;
    [SerializeField] Button toggleButton;
    [SerializeField] Image toggleIcon;
    [SerializeField] Sprite image_Show;
    [SerializeField] Sprite image_Hide;
    
    [HideInInspector] public bool planesVisible = true;
    
    public static PlaneToggleUI Instance;
    
    private void Awake()
    {
        Instance = this;
        
        planeManager.enabled = Login.logAsAdmin;
        
        if (toggleButton != null)
            toggleButton.onClick.AddListener(TogglePlanes);
    }
    
    private void TogglePlanes()
    {
        planesVisible = !planesVisible;
        
        showPlanes(planesVisible);
        
        toggleIcon.sprite = planesVisible ? image_Show : image_Hide;
    }
    
    public void showPlanes(bool isVisible)
    {
        foreach (var plane in planeManager.trackables)
            plane.gameObject.SetActive(isVisible);

        planeManager.enabled = isVisible;
    }
}