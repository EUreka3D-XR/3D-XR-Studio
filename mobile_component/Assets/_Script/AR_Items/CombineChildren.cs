using System.Collections.Generic;
using UnityEngine;

[RequireComponent(typeof(MeshFilter), typeof(MeshRenderer))]
public class CombineChildren : MonoBehaviour
{
    [Tooltip("Distrugge i GameObject figli dopo la combinazione")]
    public bool destroyChildren = true;
    
    [ContextMenu("Combine Now")]
    public void CombineNow() => Combine(gameObject);
    
    public static void Combine(GameObject root, bool destroyChildren = true)
    {
        if (root == null) return;

        var meshFilters = root.GetComponentsInChildren<MeshFilter>();
        if (meshFilters.Length == 0) return;

        var combinesPerMat = new Dictionary<Material, List<CombineInstance>>();

        foreach (var mf in meshFilters)
        {
            var mr = mf.GetComponent<MeshRenderer>();
            if (mf.sharedMesh == null || mr == null) continue;

            for (int s = 0; s < mf.sharedMesh.subMeshCount; s++)
            {
                var mat = mr.sharedMaterials[s];
                if (!combinesPerMat.TryGetValue(mat, out var list))
                {
                    list = new List<CombineInstance>();
                    combinesPerMat[mat] = list;
                }

                list.Add(new CombineInstance
                {
                    mesh = mf.sharedMesh,
                    subMeshIndex = s,
                    transform = root.transform.worldToLocalMatrix * mf.transform.localToWorldMatrix
                });
            }
        }

        var subMeshes = new List<Mesh>();
        var materials = new List<Material>();

        foreach (var kvp in combinesPerMat)
        {
            var m = new Mesh { name = "Combined_" + kvp.Key.name };
            m.CombineMeshes(kvp.Value.ToArray(), true, true);
            subMeshes.Add(m);
            materials.Add(kvp.Key);
        }

        var finalMesh = new Mesh { name = root.name + "_Combined" };
        var ciFinal = new CombineInstance[subMeshes.Count];
        for (int i = 0; i < subMeshes.Count; i++)
        {
            ciFinal[i].mesh = subMeshes[i];
            ciFinal[i].transform = Matrix4x4.identity;
        }
        finalMesh.CombineMeshes(ciFinal, false, false);

        var rootMF = root.GetComponent<MeshFilter>() ?? root.AddComponent<MeshFilter>();
        var rootMR = root.GetComponent<MeshRenderer>() ?? root.AddComponent<MeshRenderer>();
        rootMF.sharedMesh = finalMesh;
        rootMR.sharedMaterials = materials.ToArray();

        if (destroyChildren)
        {
            for (int i = root.transform.childCount - 1; i >= 0; i--)
                Object.DestroyImmediate(root.transform.GetChild(i).gameObject);
        }
    }
}
