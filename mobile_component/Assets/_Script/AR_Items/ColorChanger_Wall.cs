using System;
using UnityEngine;

public class ColorChanger_Wall : ColorChanger
{
    protected override void Start()
    {
        if (!Login.logAsAdmin)
            return;

        base.Start();

        var mr = GetComponent<MeshRenderer>();
        renderers = mr != null ? new Renderer[] { mr } : Array.Empty<Renderer>();

        originalMaterials.Clear();
        if (mr != null)
        {
            originalMaterials[mr] = mr.materials;
        }
    }
}
