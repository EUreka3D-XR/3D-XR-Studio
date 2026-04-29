using System;
using UnityEngine;

public class LookAtCamera : MonoBehaviour
{
    private Camera mainCamera;
    
    private void Start()
    {
        mainCamera = Camera.main;
    }
    
    private void Update()
    { 
        transform.LookAt(mainCamera.transform);
        transform.Rotate(0, 180f, 0);
    }
}
