using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(LineRenderer))]
public class ARPathBuilder : MonoBehaviour
{
    [Header("References")]
    [SerializeField] GameObject pointPrefab;
    [SerializeField] Transform pointsParent;
    [SerializeField] Button button_AddPoints;
    public Material highlightMaterial;
    
    [Header("Spawn Settings")]
    [SerializeField] float spawnDistance = 2f;
    
    LineRenderer lr;
    public readonly List<Transform> nodes = new();
    Vector3[] buffer = System.Array.Empty<Vector3>();
    
    public static bool moveDuringThisFrame;
    
    public static ARPathBuilder Instance;
    
    private void Awake()
    {
        Instance = this;
        lr = GetComponent<LineRenderer>();
        if (pointsParent == null) pointsParent = transform;
        button_AddPoints.onClick.AddListener(SpawnAndInsertPoint);
    }
    
    private void LateUpdate()
    {
        if (nodes.Count > 0 && moveDuringThisFrame)
        {
            RefreshLR();
            moveDuringThisFrame = false;
        }
    }
    
    private void SpawnAndInsertPoint()
    {
        Camera cam = Camera.main;
        Vector3 pos = cam.transform.position + cam.transform.forward * spawnDistance;
        pos = new Vector3(pos.x, pos.y - 1, pos.z);
        
        GameObject go = Instantiate(pointPrefab, pos, Quaternion.identity, pointsParent);
        if (!go.TryGetComponent<ColorChanger>(out _))            go.AddComponent<ColorChanger>();
        go.GetComponent<ColorChanger>().highlightMaterial = highlightMaterial;
        
        nodes.Add(go.transform);
        go.GetComponentInChildren<TextMeshProUGUI>().text = (nodes.Count).ToString();
        
        RefreshLR();
    }
    
    public void RefreshLR()
    {
        if (buffer.Length != nodes.Count) buffer = new Vector3[nodes.Count];
        for (int i = 0; i < nodes.Count; i++) buffer[i] = nodes[i].position;

        lr.positionCount = buffer.Length;
        lr.SetPositions(buffer);
    }
    
    public void ResetNumbersOverPoints()
    {
        for (int i = 0; i < nodes.Count; i++)
        {
            if (nodes[i] == null) continue;
            nodes[i].gameObject.GetComponentInChildren<TextMeshProUGUI>().text = (i + 1).ToString();
        }
    }
    
    public void clearPathAndReassignPoints(List<PathPointData> newPoints)
    {
        foreach (var node in nodes.Where(node => node != null))
        {
            Destroy(node.gameObject);
        }
        nodes.Clear();
        lr.positionCount = 0;
        
        Debug.Log("Removed all old points and cleared LineRenderer.");
        
        var sortedPoints = newPoints
            .Where(p => p.index > 0)
            .OrderBy(p => p.index)
            .ToList();
        
        foreach (var point in sortedPoints)
        {
            GameObject go = Instantiate(pointPrefab, point.position, Quaternion.identity, pointsParent);
            if (!go.TryGetComponent<ColorChanger>(out _))            go.AddComponent<ColorChanger>();
            
            nodes.Add(go.transform);
        }
        
        Debug.Log("Added new points to the path.");
        
        RefreshLR();
        ResetNumbersOverPoints();
    }
}
