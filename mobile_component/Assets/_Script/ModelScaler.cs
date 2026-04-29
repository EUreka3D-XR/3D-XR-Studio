using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ModelScaler : MonoBehaviour
{
    [Header("Impostazioni di Scaling")]
    private const float scaleSpeed = 10.0f;
    private const float minScale = 0.001f;
    private const float maxScale = 100f;
    private const float maxBoundsMagnitude = 10000f;

    private int collisionCount = 0;
    
    private readonly WaitForFixedUpdate waitFixed = new WaitForFixedUpdate();

    private IEnumerator Start()
    {
        Rigidbody rb = gameObject.AddComponent<Rigidbody>();
        rb.isKinematic = true;
        rb.collisionDetectionMode = CollisionDetectionMode.Continuous;

        yield return StartCoroutine(AdjustScale());
        
        gameObject.AddComponent<AutorotateObjects>();
    }
    
    private IEnumerator AdjustScale()
    {
        yield return waitFixed;

        float currentScale = transform.localScale.x;

        if (!IsFinite(currentScale) || currentScale <= 0f)
        {
            currentScale = 1f;
            transform.localScale = Vector3.one * currentScale;
        }
        
        if (collisionCount > 0)
        {
            while (collisionCount > 0 && currentScale > minScale)
            {
                currentScale -= currentScale / scaleSpeed;
                currentScale = Mathf.Max(currentScale, minScale);
                transform.localScale = Vector3.one * currentScale;
                yield return waitFixed;
            }
            
            if (!CanApplyScale(currentScale))
            {
                Debug.LogWarning("[ModelScaler] Scala non valida durante la riduzione. Interruzione scaling.");
                yield break;
            }

            transform.localScale = Vector3.one * currentScale;
            yield return waitFixed;

            yield return null;
        }

        while (collisionCount == 0 && currentScale < maxScale)
        {
            currentScale += currentScale / scaleSpeed;
            currentScale = Mathf.Clamp(currentScale, minScale, maxScale);

            if (!CanApplyScale(currentScale))
            {
                Debug.LogWarning("[ModelScaler] Bounds troppo grandi o valori non finiti. Stop aumento scala.");
                yield break;
            }
            
            transform.localScale = Vector3.one * currentScale;
            yield return waitFixed;

            if (collisionCount > 0)
            {
                currentScale -= currentScale / scaleSpeed;
                currentScale = Mathf.Clamp(currentScale, minScale, maxScale);
                transform.localScale = Vector3.one * currentScale;
                break;
            }
        }
    }
    
    private bool CanApplyScale(float scale)
    {
        if (!IsFinite(scale) || scale <= 0f)
            return false;

        Vector3 testScale = Vector3.one * scale;

        if (!IsFinite(testScale.x) || !IsFinite(testScale.y) || !IsFinite(testScale.z))
            return false;

        var renderers = GetComponentsInChildren<Renderer>();
        foreach (var renderer in renderers)
        {
            Bounds b = renderer.bounds;

            if (!IsFinite(b.center.x) || !IsFinite(b.center.y) || !IsFinite(b.center.z) ||
                !IsFinite(b.size.x) || !IsFinite(b.size.y) || !IsFinite(b.size.z))
            {
                return false;
            }

            if (b.size.magnitude > maxBoundsMagnitude || b.center.magnitude > maxBoundsMagnitude)
            {
                return false;
            }
        }

        return true;
    }

    private bool IsFinite(float value)
    {
        return !float.IsNaN(value) && !float.IsInfinity(value);
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("3DModelUI_SizeLimit"))
        {
            collisionCount++;
        }
    }

    private void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("3DModelUI_SizeLimit"))
        {
            collisionCount = Mathf.Max(0, collisionCount - 1);
        }
    }
}
