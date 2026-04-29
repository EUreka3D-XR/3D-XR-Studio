using UnityEngine;

public class ScanLineEffect : MonoBehaviour
{
    [Tooltip("RectTransform of the green scanning line")]
    [SerializeField] private RectTransform line;

    [Tooltip("Speed in UI units per second")]
    [SerializeField] private float speed = 400f;

    private float minY, maxY;
    private int direction = 1;

    void Start()
    {
        if (line == null)
        {
            Debug.LogError("[ScanLineEffect] Line reference not set.");
            enabled = false;
            return;
        }

        RectTransform rt = GetComponent<RectTransform>();
        float halfTravel = (rt.rect.height - line.rect.height) * 0.5f;
        minY = -halfTravel;
        maxY = halfTravel;

        Vector3 pos = line.localPosition;
        pos.y = maxY;
        line.localPosition = pos;
        direction = -1;
    }

    void Update()
    {
        if (line == null) return;

        Vector3 pos = line.localPosition;
        pos.y += speed * direction * Time.deltaTime;

        if (pos.y >= maxY)
        {
            pos.y = maxY;
            direction = -1;
        }
        else if (pos.y <= minY)
        {
            pos.y = minY;
            direction = 1;
        }

        line.localPosition = pos;
    }
}