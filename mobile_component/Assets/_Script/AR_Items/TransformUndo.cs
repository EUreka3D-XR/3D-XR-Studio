using UnityEngine;
using System.Collections.Generic;
using Unity.VisualScripting;

public static class TransformUndo
{
    public struct Snapshot
    {
        public Vector3 position;     // world
        public Quaternion rotation;  // world
        public Vector3 scale;        // local

        public Snapshot(Transform t)
        {
            position = t.position;
            rotation = t.rotation;
            scale = t.localScale;
        }

        public void ApplyTo(Transform t)
        {
            t.SetPositionAndRotation(position, rotation);
            t.localScale = scale;
        }
    }

    private static readonly Dictionary<GameObject, Snapshot> last = new();

    public static void Save(GameObject go)
    {
        if (!go) return;
        last[go] = new Snapshot(go.transform);
    }

    public static void Save(Transform t)
    {
        if (t) Save(t.gameObject);
    }

    public static bool Undo(GameObject go)
    {
        if (!go) return false;
        if (!last.TryGetValue(go, out var snap)) return false;
        snap.ApplyTo(go.transform);
        return true;
    }
}