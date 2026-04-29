using UnityEngine;

[RequireComponent(typeof(MeshCollider))]
[RequireComponent(typeof(LineRenderer))]
public class DownwardLineDrawer : MonoBehaviour
{
    [Header("Line settings")]
    [Tooltip("Lunghezza della linea in metri (direzione -Y)")]
    public float lineLength = 5f;
    
    [Tooltip("Spessore della linea")]
    public float lineWidth = 0.05f;
    
    [Tooltip("Colore della linea")]
    public Color lineColor = Color.red;
    
    private MeshCollider meshCol;
    private LineRenderer lineRend;

    private void Awake()
    {
        meshCol = GetComponent<MeshCollider>();
        
        lineRend = GetComponent<LineRenderer>();
        if (lineRend == null)
            lineRend = gameObject.AddComponent<LineRenderer>();
        
        lineRend.positionCount = 2;
        lineRend.startWidth = lineWidth;
        lineRend.endWidth = lineWidth;
        lineRend.material = new Material(Shader.Find("Sprites/Default"));
        lineRend.startColor = lineColor;
        lineRend.endColor = lineColor;
        lineRend.useWorldSpace = true;
    }
    
    private void LateUpdate()
    {
        Vector3 startPoint = transform.position;
        Vector3 endPoint = startPoint + Vector3.down * lineLength;

        lineRend.SetPosition(0, startPoint);
        lineRend.SetPosition(1, endPoint);
    }
}