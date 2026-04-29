using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class HideForVisitors : MonoBehaviour
{
    [SerializeField] private MeshRenderer meshRenderer;
    [SerializeField] private List<TextMeshProUGUI> textToHide;
    
    private void OnEnable()
    {
        meshRenderer.enabled = Login.logAsAdmin;
        
        foreach (var tmPro in textToHide)
        {
            tmPro.enabled = Login.logAsAdmin;
        }
    }
}
