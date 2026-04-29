using UnityEngine;

public class KeepAwake : MonoBehaviour
{
    void Awake()
    {
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        Application.runInBackground = true; 
        DontDestroyOnLoad(gameObject);
    }

    void OnDestroy()
    {
        Screen.sleepTimeout = SleepTimeout.SystemSetting;
    }
}