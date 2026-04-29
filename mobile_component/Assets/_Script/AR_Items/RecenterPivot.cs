using UnityEngine;

public static class RecenterPivot
{
    public static void Bake(GameObject root)
    {
        var mf = root.GetComponent<MeshFilter>();
        if (mf == null || mf.sharedMesh == null) return;

        var mesh = Object.Instantiate(mf.sharedMesh);
        mesh.RecalculateBounds();
        var center = mesh.bounds.center;

        var verts = mesh.vertices;
        for (int i = 0; i < verts.Length; i++) verts[i] -= center;
        mesh.vertices = verts;

        mesh.RecalculateBounds();
        mesh.RecalculateNormals();
        mesh.RecalculateTangents();

        mf.sharedMesh = mesh;

        root.transform.position += root.transform.TransformVector(center);
    }
}