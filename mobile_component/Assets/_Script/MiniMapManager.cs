using System;
using UnityEngine;

public class MiniMapManager : MonoBehaviour
{
    public GameObject minimap;
    public Camera minimap_Camera;
    public GameObject Button_zoom_plus;
    public GameObject Button_zoom_minus;
    public Transform player_Transform;
    public Transform Camera_Minimap_Transform;
    public RectTransform LocationPinIcon_Minimap_RectTransform;
    private float fixed_Camera_Minimap_Transform_height;
    
    private const float initial_Camera_Zoom = 6.0f;
    private const float min_Camera_Zoom = 2.0f;
    private const float max_Camera_Zoom = 80.0f;
    private const float zoomSpeed_base = 4.0f;
    private const float downLimitToMinorZoom = 6.0f;
    private const float upLimitToDoubleZoom = 24.0f;
    private const float upLimitToTripleZoom = 40.0f;
    
    private void Awake()
    {
        fixed_Camera_Minimap_Transform_height = minimap_Camera.transform.position.y;
    }
    
    private void Start()
    {
        minimap.SetActive(false);
        Button_zoom_plus.SetActive(false);
        Button_zoom_minus.SetActive(false);
    }
    
    private void LateUpdate()
    {
        Camera_Minimap_Transform.position = new Vector3(player_Transform.position.x, fixed_Camera_Minimap_Transform_height, player_Transform.position.z);
    }
    
    public void invertMinimapVisibility()
    {
        minimap.SetActive(!minimap.activeSelf);
        
        if (minimap.activeSelf)
        {
            minimap_Camera.orthographicSize = initial_Camera_Zoom;
            Button_zoom_plus.SetActive(true);
            Button_zoom_minus.SetActive(true);
        }
        else
        {
            Button_zoom_plus.SetActive(false);
            Button_zoom_minus.SetActive(false);
        }
    }
    
    public void zoomIn()
    {
        Button_zoom_minus.SetActive(true);
        
        float step = CalculateZoomStep();
        minimap_Camera.orthographicSize = Mathf.Clamp(minimap_Camera.orthographicSize - step, min_Camera_Zoom, max_Camera_Zoom);
        
        UpdateIconScale();
        
        if (minimap_Camera.orthographicSize <= min_Camera_Zoom)
            Button_zoom_plus.SetActive(false);
    }
    
    public void zoomOut()
    {
        Button_zoom_plus.SetActive(true);
        
        float step = CalculateZoomStep();
        minimap_Camera.orthographicSize = Mathf.Clamp(minimap_Camera.orthographicSize + step, min_Camera_Zoom, max_Camera_Zoom);
        
        UpdateIconScale();
        
        if (minimap_Camera.orthographicSize >= max_Camera_Zoom)
            Button_zoom_minus.SetActive(false);
    }
    
    private float CalculateZoomStep()
    {
        if (minimap_Camera.orthographicSize <= downLimitToMinorZoom)
            return 1.0f;
        
        if (minimap_Camera.orthographicSize > upLimitToTripleZoom)
            return zoomSpeed_base * 3.0f;
        
        if (minimap_Camera.orthographicSize > upLimitToDoubleZoom)
            return zoomSpeed_base * 2.0f;
        
        return zoomSpeed_base;
    }
    
    private void UpdateIconScale()
    {
        float scaleFactor = minimap_Camera.orthographicSize / initial_Camera_Zoom;
        LocationPinIcon_Minimap_RectTransform.localScale = new Vector3(scaleFactor, scaleFactor, 1f);
    }
}
