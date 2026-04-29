using UnityEngine;

[RequireComponent(typeof(RectTransform))]
public class MiniMapPointer : MonoBehaviour
{
    [SerializeField] Camera targetCamera;
    [SerializeField] bool invert = true;      
    [SerializeField] float smoothDegPerSec = 0f;
    
    RectTransform rect;
    
    void Awake()
    {
        rect = (RectTransform)transform;
        if (!targetCamera) targetCamera = Camera.main;
    }
    
    void LateUpdate()
    {
        if (!targetCamera) return;
        
        Vector3 fwd = targetCamera.transform.forward;
        fwd.y = 0f;
        if (fwd.sqrMagnitude < 1e-4f) return;
        
        float heading = Mathf.Atan2(fwd.x, fwd.z) * Mathf.Rad2Deg;
        
        float z = (invert ? -heading : heading);
        Quaternion targetRot = Quaternion.Euler(0f, 0f, z);
        
        if (smoothDegPerSec > 0f)
            rect.localRotation = Quaternion.RotateTowards(rect.localRotation, targetRot, smoothDegPerSec * Time.deltaTime);
        else
            rect.localRotation = targetRot;
    }
}