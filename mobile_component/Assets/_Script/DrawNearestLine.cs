using System.Collections;
using UnityEngine;
using System.Collections.Generic;
using TMPro;
using UnityEngine.UI;

public class DrawNearestLine : MonoBehaviour
{
    public GameObject parent_gameobject; // GameObject padre che contiene i MeshCollider

    public TextMeshProUGUI H_text;
    public TextMeshProUGUI S_text;
    public TextMeshProUGUI D_text;
    
    [SerializeField] Button toggleButton;
    [SerializeField] Image toggleIcon;
    [SerializeField] Sprite image_Show;
    [SerializeField] Sprite image_Hide;
    
    private readonly Color lineColor = Color.blue; // Colore blu per la linea
    private const float lineWidth = 0.05f; // Spessore della linea
    private List<MeshCollider> meshColliders = new List<MeshCollider>();
    
    [HideInInspector] public LineRenderer lineRenderer;
    [HideInInspector] public bool lineVisibility = true;
    public static DrawNearestLine Instance;
    
    private void Awake()
    {
        Instance = this;
        
        if (toggleButton != null)
            toggleButton.onClick.AddListener(() =>
            {
                lineVisibility = !lineVisibility;
                toggleIcon.sprite = lineVisibility ? image_Show : image_Hide;
            });
    }
    
    public void InitializeNearestLine()
    {
        UpdateMeshCollidersList();
        
        lineRenderer = GetComponent<LineRenderer>();
        lineRenderer.startWidth = lineWidth;
        lineRenderer.endWidth = lineWidth;
        lineRenderer.positionCount = 2;
        
        StartCoroutine(UpdateCoroutine());
    }

    public void UpdateMeshCollidersList()
    {
        meshColliders.Clear();
        
        if (parent_gameobject != null)
            meshColliders = new List<MeshCollider>(parent_gameobject.GetComponentsInChildren<MeshCollider>());
        else
            Debug.LogWarning("parent_gameobject non è stato assegnato!");
    }
    
    private IEnumerator UpdateCoroutine()
    {
        if (meshColliders != null)
        {
            if (meshColliders == null || meshColliders.Count == 0)
            {
                lineRenderer.SetPosition(0, Vector3.zero);
                lineRenderer.SetPosition(1, Vector3.zero);
                H_text.text = "H: " + "No obj";
                S_text.text = "S: " + "No obj";
                D_text.text = "D: " + "No obj";
            }
            else
            {
                MeshCollider nearestCollider = null;
                float minDistance = Mathf.Infinity;
                Vector3 myPosition = transform.position;
        
                // Trova il MeshCollider più vicino
                foreach (MeshCollider collider in meshColliders)
                {
                    if (collider == null) continue;
                    float distance = Vector3.Distance(myPosition, collider.transform.position);
            
                    H_text.text = "H: " + collider.transform.position.y.ToString("F2");
                    S_text.text = "S: " + collider.transform.localScale.x.ToString("F2");
                    D_text.text = "D: " + distance.ToString("F2");
            
                    if (distance < minDistance)
                    {
                        minDistance = distance;
                        nearestCollider = collider;
                    }
                }
        
                // Se esiste un collider vicino, aggiorna la linea
                if (nearestCollider != null)
                {
                    lineRenderer.SetPosition(0, myPosition);
                    lineRenderer.SetPosition(1, nearestCollider.transform.position);
                    lineRenderer.enabled = lineVisibility;
                }
            }
        }
        
        yield return new WaitForSeconds(0.2f);
        StartCoroutine(UpdateCoroutine());
    }
}
