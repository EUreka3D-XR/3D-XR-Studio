using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;
using Sych.ShareAssets.Runtime;
using Object = UnityEngine.Object;

public class SocialShare : MonoBehaviour
{
    private string lastScreenshotPath;
    
    public async void ShareScreenshot()
    {
        lastScreenshotPath = await CaptureCurrentFrameAsync();
        shareLastScreenshot();
    }
    
    private async Task<string> CaptureCurrentFrameAsync()
    {
        var cam   = Camera.main;
        var rt    = new RenderTexture(Screen.width, Screen.height, 24);
        cam.targetTexture = rt;
        cam.Render();
        
        RenderTexture.active = rt;
        var tex = new Texture2D(Screen.width, Screen.height, TextureFormat.RGB24, false);
        tex.ReadPixels(new Rect(0, 0, Screen.width, Screen.height), 0, 0);
        tex.Apply();
        
        cam.targetTexture    = null;
        RenderTexture.active = null;
        Object.Destroy(rt);
        
        var bytes = tex.EncodeToPNG();
        var path  = Path.Combine(Application.persistentDataPath, $"story_{DateTime.Now:yyyyMMdd_HHmmss}.png");
        await File.WriteAllBytesAsync(path, bytes);
        return path;
    }
    
    private void shareLastScreenshot()
    {
        Share.Items(
            new List<string>() { lastScreenshotPath },
            success => { if (success) { Debug.Log("Share operation completed (window was opened and returned)"); } 
                else { Debug.LogWarning("Failed to open share window"); }});
    }
}
