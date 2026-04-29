using System.Collections.Generic;
using UnityEngine;

public class ColorChanger : MonoBehaviour
{
    public Material highlightMaterial; 
    
    protected Renderer[] renderers;
    
    protected readonly Dictionary<Renderer, Material[]> originalMaterials = new Dictionary<Renderer, Material[]>();

    private static ColorChanger currentlyHighlighted;
    
    [SerializeField] float emissionIntensity = 2.0f;

    protected virtual void Start()
    {
        if (!Login.logAsAdmin) return;

        if (highlightMaterial == null)
        {
            highlightMaterial = new Material(Shader.Find("Unlit/UnlitTwoSidedColor"));
            highlightMaterial.color = Color.yellow;
            highlightMaterial.EnableKeyword("_EMISSION");
            highlightMaterial.SetColor("_EmissionColor", Color.yellow);
            Debug.LogWarning("Materiale di Highlight non assegnato, ne è stato creato uno di default.", this);
        }

        renderers = GetComponentsInChildren<Renderer>(true);

        foreach (var r in renderers)
        {
            if (r != null)
            {
                originalMaterials[r] = r.materials;
            }
        }
    }

    public void SetHighlightExclusive()
    {
        if (currentlyHighlighted != null && currentlyHighlighted != this)
        {
            currentlyHighlighted.RestoreOriginalColors();
        }
        currentlyHighlighted = this;
        SetAllRendererColor();
    }

    public void SetAllRendererColor()
    {
        if (renderers == null) return;

        foreach (var r in renderers)
        {
            if (r == null) continue;

            var highlightMats = new Material[r.materials.Length];
            for (int i = 0; i < highlightMats.Length; i++)
            {
                highlightMats[i] = highlightMaterial;
            }
            
            r.materials = highlightMats;
        }
    }

    public void RestoreOriginalColors()
    {
        if (renderers == null) return;

        foreach (var r in renderers)
        {
            if (r != null && originalMaterials.ContainsKey(r))
            {
                r.materials = originalMaterials[r];
            }
        }

        if (currentlyHighlighted == this)
        {
            currentlyHighlighted = null;
        }
    }
}
