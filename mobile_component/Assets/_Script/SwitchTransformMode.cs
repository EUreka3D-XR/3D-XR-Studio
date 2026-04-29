using System;
using UnityEngine;

public class SwitchTransformMode : MonoBehaviour
{
    public GameObject Image_Transform_X;
    public GameObject Image_Transform_Y;
    public GameObject Image_Transform_Depth;
    public GameObject Image_Rotation_X;
    public GameObject Image_Rotation_Y;
    public GameObject Image_Rotation_Z;

    private static int stateNum = 1;
    
    private void Start()
    {
        SwitchImage(1);
    }
    
    public void ChangeTransformMode()
    {
        switch (stateNum)
        {
            case 1:
                SwitchImage(2);
                stateNum++;
                break;
            case 2:
                SwitchImage(3);
                stateNum++;
                break;
            case 3:
                SwitchImage(4);
                stateNum++;
                break;
            case 4:
                SwitchImage(5);
                stateNum++;
                break;
            case 5:
                SwitchImage(6);
                stateNum++;
                break;
            case 6:
                SwitchImage(1);
                stateNum = 1;
                break;
        }
    }

    private void SwitchImage(int i)
    {
        Image_Transform_X.SetActive(false);
        Image_Transform_Y.SetActive(false);
        Image_Transform_Depth.SetActive(false);
        Image_Rotation_X.SetActive(false);
        Image_Rotation_Y.SetActive(false);
        Image_Rotation_Z.SetActive(false);
        
        switch (i)
        {
            case 1:
                Image_Transform_X.SetActive(true);
                break;
            case 2:
                Image_Transform_Y.SetActive(true);
                break;
            case 3:
                Image_Transform_Depth.SetActive(true);
                break;
            case 4:
                Image_Rotation_X.SetActive(true);
                break;
            case 5:
                Image_Rotation_Y.SetActive(true);
                break;
            case 6:
                Image_Rotation_Z.SetActive(true);
                break;
        }
    }
}
