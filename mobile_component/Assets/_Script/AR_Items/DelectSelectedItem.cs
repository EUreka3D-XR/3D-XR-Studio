using System.Collections;
using UnityEngine;

public class DelectSelectedItem : MonoBehaviour
{
    public GameObject _gameObject;
    
    public void delect()
    {
        if (_gameObject == null)
            return;
        
        var selectedGO = _gameObject;
        Destroy(_gameObject.transform.parent.gameObject);

    }
    
    private IEnumerator UpdateMeshCollidersNextFrame()
    {
        yield return null;
        DrawNearestLine.Instance.UpdateMeshCollidersList();
    }
}
