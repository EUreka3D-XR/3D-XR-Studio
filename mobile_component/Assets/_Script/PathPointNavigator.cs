using UnityEngine;
using UnityEngine.UI;

public class PathPointNavigator : MonoBehaviour
{
    [Header("UI")]
    [SerializeField] private Button btnNext;
    [SerializeField] private Button btnPrev;
    
    private void Awake()
    {
        btnNext.onClick.AddListener(() => Move(+1));
        btnPrev.onClick.AddListener(() => Move(-1));
    }
    
    private void Move(int dir)
    {
        var pb = ARPathBuilder.Instance;
        if (pb == null) return;
        
        int index = pb.nodes.IndexOf(transform);
        int newIndex = index + dir;

        if (newIndex < 0 || newIndex >= pb.nodes.Count) return;

        (pb.nodes[index], pb.nodes[newIndex]) = (pb.nodes[newIndex], pb.nodes[index]);

        pb.ResetNumbersOverPoints();
        ARPathBuilder.moveDuringThisFrame = true;
    }
}
