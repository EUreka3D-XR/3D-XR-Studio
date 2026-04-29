using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class SwitchWallMat : MonoBehaviour
{
    [Header("Target Parent Object")]
    public GameObject targetParent;
    
    [Header("Materials")]
    public Material material_Wall_Visible;
    public Material material_Wall_Not_Visible;

    public Image showHideImg_UI;
    public Sprite Sprite_showWall;
    public Sprite Sprite_hideWall;
    
    public Button addWall_Btn;
    public Image addWall_Img;
    public Color addWall_Color_disable;
    
    private readonly List<MeshRenderer> wallRenderers = new List<MeshRenderer>();

    public static bool actualWallMat_IsVisible;

    public static SwitchWallMat Instance;

    private void Awake()
    {
        Instance = this;
    }
    
    public void SwitchWall_Mat()
    {
        if (actualWallMat_IsVisible) 
            SwitchMat_Invisible(); 
        else 
            SwitchMat_Visible();
    }
    
    public void SwitchMat_Visible()
    {
        foreach (Transform child in targetParent.transform)
        {
            if (child.GetComponent<ColorChanger_Wall>() != null)
            {
                MeshRenderer rend = child.GetComponent<MeshRenderer>();
                if (rend != null)
                {
                    wallRenderers.Add(rend);
                }
                child.GetComponent<BoxCollider>().enabled = true;
            }
        }
        
        addWall_Btn.interactable = true;
        addWall_Img.color = Color.white;
        
        actualWallMat_IsVisible = true;
        showHideImg_UI.sprite = Sprite_showWall;
        
        if (wallRenderers.Count == 0)
        {
            Debug.LogWarning("Nessun oggetto trovato con SelectableTransformable_Wall");
            return;
        }
        
        foreach (MeshRenderer rend in wallRenderers)
        {
            rend.material = material_Wall_Visible;
        }
        
        wallRenderers.Clear();
    }
    
    public void SwitchMat_Invisible(bool change_boolean_ActualWallMat_in = false)
    {
        foreach (Transform child in targetParent.transform)
        {
            if (child.GetComponent<ColorChanger_Wall>() != null)
            {
                MeshRenderer rend = child.GetComponent<MeshRenderer>();
                if (rend != null)
                {
                    wallRenderers.Add(rend);
                }
                child.GetComponent<BoxCollider>().enabled = false;
            }
        }

        addWall_Btn.interactable = false;
        addWall_Img.color = addWall_Color_disable;
        
        actualWallMat_IsVisible = change_boolean_ActualWallMat_in;
        showHideImg_UI.sprite = Sprite_hideWall;
        
        if (wallRenderers.Count == 0)
        {
            Debug.LogWarning("Nessun oggetto trovato con SelectableTransformable_Wall");
            return;
        }
        
        foreach (MeshRenderer rend in wallRenderers)
        {
            rend.material = material_Wall_Not_Visible;
        }
        
        wallRenderers.Clear();
    }
}
