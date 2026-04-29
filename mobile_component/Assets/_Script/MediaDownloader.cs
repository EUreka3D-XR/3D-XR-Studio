using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

public class MediaDownloader : MonoBehaviour
{
    public static MediaDownloader Instance;
    
    private static string ImageCachePath => Application.persistentDataPath + "image";
    private static string AudioCachePath => AudioPopupController.INTEREST_POINTS_AUDIO_FOLDER;
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            InitializeCacheFolders();
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    private void InitializeCacheFolders()
    {
        Directory.CreateDirectory(ImageCachePath);
        Directory.CreateDirectory(AudioCachePath);
        Debug.Log($"[MediaDownloader] Cache inizializzata:\n- Images: {ImageCachePath}\n- Audio: {AudioCachePath}");
    }
    
    public async Task<string> DownloadImage(string url, string fileName = null)
    {
        if (string.IsNullOrEmpty(url))
        {
            Debug.LogWarning("[MediaDownloader] URL immagine vuoto");
            return null;
        }
        
        if (string.IsNullOrEmpty(fileName))
            fileName = GetFileNameFromUrl(url);
        
        string localPath = Path.Combine(ImageCachePath, fileName);
        
        if (File.Exists(localPath))
        {
            Debug.Log($"[MediaDownloader] Immagine già in cache: {fileName}");
            return localPath;
        }
        
        try
        {
            using (UnityWebRequest request = UnityWebRequestTexture.GetTexture(url))
            {
                var operation = request.SendWebRequest();
                
                while (!operation.isDone)
                    await Task.Yield();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    Texture2D texture = DownloadHandlerTexture.GetContent(request);
                    byte[] bytes = texture.EncodeToPNG();
                    await File.WriteAllBytesAsync(localPath, bytes);
                    
                    Debug.Log($"[MediaDownloader] Immagine scaricata: {fileName}");
                    return localPath;
                }
                else
                {
                    Debug.LogError($"[MediaDownloader] Errore download immagine: {request.error}");
                    return null;
                }
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"[MediaDownloader] Eccezione durante download immagine: {e.Message}");
            return null;
        }
    }
    
    public async Task<string> DownloadAudio(string url, string fileName = null)
    {
        if (string.IsNullOrEmpty(url))
        {
            Debug.LogWarning("[MediaDownloader] URL audio vuoto");
            return null;
        }
        
        if (string.IsNullOrEmpty(fileName))
            fileName = GetFileNameFromUrl(url);
        
        string localPath = Path.Combine(AudioCachePath, fileName);
        
        if (File.Exists(localPath))
        {
            Debug.Log($"[MediaDownloader] Audio già in cache: {fileName}");
            return localPath;
        }
        
        try
        {
            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                var operation = request.SendWebRequest();
                
                while (!operation.isDone)
                    await Task.Yield();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    byte[] audioData = request.downloadHandler.data;
                    await File.WriteAllBytesAsync(localPath, audioData);
                    
                    Debug.Log($"[MediaDownloader] Audio scaricato: {fileName}");
                    return localPath;
                }
                else
                {
                    Debug.LogError($"[MediaDownloader] Errore download audio: {request.error}");
                    return null;
                }
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"[MediaDownloader] Eccezione durante download audio: {e.Message}");
            return null;
        }
    }
    
    public Texture2D LoadImageFromCache(string localPath)
    {
        if (!File.Exists(localPath))
        {
            Debug.LogWarning($"[MediaDownloader] File immagine non trovato: {localPath}");
            return null;
        }
        
        try
        {
            byte[] fileData = File.ReadAllBytes(localPath);
            Texture2D texture = new Texture2D(2, 2);
            texture.LoadImage(fileData);
            return texture;
        }
        catch (Exception e)
        {
            Debug.LogError($"[MediaDownloader] Errore caricamento immagine: {e.Message}");
            return null;
        }
    }
    
    public async Task<AudioClip> LoadAudioFromCache(string localPath)
    {
        if (!File.Exists(localPath))
        {
            Debug.LogWarning($"[MediaDownloader] File audio non trovato: {localPath}");
            return null;
        }
        
        try
        {
            string uri = "file://" + localPath;
            
            AudioType audioType = GetAudioType(localPath);
            
            using (UnityWebRequest request = UnityWebRequestMultimedia.GetAudioClip(uri, audioType))
            {
                ((DownloadHandlerAudioClip)request.downloadHandler).streamAudio = false;
                
                var operation = request.SendWebRequest();
                
                while (!operation.isDone)
                    await Task.Yield();
                
                if (request.result == UnityWebRequest.Result.Success)
                {
                    AudioClip clip = DownloadHandlerAudioClip.GetContent(request);
                    
                    if (clip != null)
                    {
                        clip.name = Path.GetFileNameWithoutExtension(localPath);
                        Debug.Log($"[MediaDownloader] Audio caricato: {clip.name} (length: {clip.length}s, frequency: {clip.frequency}Hz)");
                    }
                    
                    return clip;
                }
                else
                {
                    Debug.LogError($"[MediaDownloader] Errore caricamento audio: {request.error}");
                    return null;
                }
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"[MediaDownloader] Eccezione durante caricamento audio: {e.Message}");
            return null;
        }
    }
    
    private AudioType GetAudioType(string path)
    {
        string extension = Path.GetExtension(path).ToLower();
        
        return extension switch
        {
            ".mp3" => AudioType.MPEG,
            ".wav" => AudioType.WAV,
            ".ogg" => AudioType.OGGVORBIS,
            ".aiff" => AudioType.AIFF,
            _ => AudioType.UNKNOWN
        };
    }
    
    private string GetFileNameFromUrl(string url)
    {
        try
        {
            Uri uri = new Uri(url);
            string fileName = Path.GetFileName(uri.LocalPath);
            
            if (string.IsNullOrEmpty(Path.GetExtension(fileName)))
            {
                fileName = $"{url.GetHashCode()}.dat";
            }
            
            return fileName;
        }
        catch
        {
            return $"{url.GetHashCode()}.dat";
        }
    }
    
    public void ClearCache()
    {
        try
        {
            if (Directory.Exists(ImageCachePath))
            {
                Directory.Delete(ImageCachePath, true);
                Directory.CreateDirectory(ImageCachePath);
            }
            
            if (Directory.Exists(AudioCachePath))
            {
                Directory.Delete(AudioCachePath, true);
                Directory.CreateDirectory(AudioCachePath);
            }
            
            Debug.Log("[MediaDownloader] Cache pulita");
        }
        catch (Exception e)
        {
            Debug.LogError($"[MediaDownloader] Errore pulizia cache: {e.Message}");
        }
    }
}
