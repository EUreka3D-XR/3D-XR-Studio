using System;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.Networking;
using System.Collections.Generic;
using System.IO;

public class AudioPopupController : MonoBehaviour
{
    [Header("Refs")]
    public AudioSource audioSource;
    public Slider progress;
    public Button playPauseBtn;
    public Image playPauseIcon;
    public Sprite playSprite;
    public Sprite pauseSprite;
    public TextMeshProUGUI currentTimeTxt;
    public TextMeshProUGUI durationTxt;
    
    [Header("Behaviour")]
    public bool autoplay_When_Opens_PopUp = true;
    public bool closeOnEnd = false;
    
    Texture2D waveformTex;
    bool draggingSlider;
    
    public static string INTEREST_POINTS_AUDIO_FOLDER => Path.Combine(Application.persistentDataPath, "InterestPoints_Audios");
    public readonly Dictionary<string, AudioClip> InterestPointAudioClips = new Dictionary<string, AudioClip>(StringComparer.OrdinalIgnoreCase);
    
    public static AudioPopupController Instance;
    
    void Awake()
    {
        Instance = this;
        if (playPauseBtn != null)
            playPauseBtn.onClick.AddListener(TogglePlayPause);
    }
    
    void Update()
    {
        if (!isActiveAndEnabled || audioSource.clip == null) return;
        if (!draggingSlider && audioSource.clip.length > 0f)
        {
            float t = audioSource.time;
            float len = audioSource.clip.length;
            float norm = Mathf.Clamp01(t / len);
            progress.SetValueWithoutNotify(norm);
            currentTimeTxt.text = FormatTime(t);
            durationTxt.text    = FormatTime(len);
        }
        playPauseIcon.sprite = audioSource.isPlaying ? pauseSprite : playSprite;
        if (closeOnEnd && !audioSource.isPlaying && Mathf.Approximately(audioSource.time, audioSource.clip.length))
            Hide();
    }

    public void Show(AudioClip clip)
    {
        audioSource.Stop();
        audioSource.clip = clip;
        audioSource.gameObject.SetActive(true);

        durationTxt.text = clip ? FormatTime(clip.length) : "--:--";
        currentTimeTxt.text = "00:00";
        progress.SetValueWithoutNotify(0f);

        if (autoplay_When_Opens_PopUp) Play();
    }

    public void ShowFromURL(string url, AudioType type = AudioType.WAV)
    {
        StartCoroutine(Co_LoadAndShow(url, type));
    }

    public void Hide()
    {
        audioSource.Stop();
        audioSource.gameObject.SetActive(false);
    }
    
    public void Play()
    {
        Debug.Log($"Play audio clip: {audioSource.clip?.name}");
        if (audioSource.clip == null) return;
        audioSource.time = Mathf.Clamp(audioSource.time, 0f, audioSource.clip.length - 0.001f);
        audioSource.Play();
    }
    
    public void Pause()  => audioSource.Pause();
    public void TogglePlayPause()
    {
        if (audioSource.isPlaying) Pause(); else Play();
    }
    public void OnBeginDrag() { draggingSlider = true; }
    public void OnEndDrag()   { draggingSlider = false; }
    public void OnSeek(float normalized)
    {
        if (audioSource.clip == null) return;
        normalized = Mathf.Clamp01(normalized);
        audioSource.time = normalized * audioSource.clip.length;
        if (!audioSource.isPlaying && autoplay_When_Opens_PopUp) Play();
    }

    IEnumerator Co_LoadAndShow(string url, AudioType type)
    {
        using var req = UnityWebRequestMultimedia.GetAudioClip(url, type);
        yield return req.SendWebRequest();
        if (req.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError($"Audio load failed: {req.error}");
            yield break;
        }
        var clip = DownloadHandlerAudioClip.GetContent(req);
        Show(clip);
    }

    string FormatTime(float t)
    {
        t = Mathf.Max(0, t);
        int m = (int)(t / 60f);
        int s = (int)(t % 60f);
        return $"{m:00}:{s:00}";
    }

    public void LoadLocalInterestPointAudios()
    {
        InterestPointAudioClips.Clear();

        if (!Directory.Exists(INTEREST_POINTS_AUDIO_FOLDER))
        {
            Debug.LogWarning("Nessuna cartella audio trovata");
            return;
        }
        
        var paths = new List<string>();
        try
        {
            paths.AddRange(Directory.GetFiles(INTEREST_POINTS_AUDIO_FOLDER, "InterestPoint_*.wav"));
            paths.AddRange(Directory.GetFiles(INTEREST_POINTS_AUDIO_FOLDER, "InterestPoint_*.mp3"));
            paths.AddRange(Directory.GetFiles(INTEREST_POINTS_AUDIO_FOLDER, "InterestPoint_*.ogg"));
        }
        catch (Exception e)
        {
            Debug.LogWarning($"Errore accesso cartella audio: {e.Message}");
            return;
        }
        
        Debug.Log($"[InterestPointAudioClips] Caricamento audio da {paths.Count} file");
        
        StartCoroutine(Co_LoadLocalInterestPointAudios(paths));
    }

    private IEnumerator Co_LoadLocalInterestPointAudios(List<string> paths)
    {
        foreach (var path in paths)
        {
            string fileName = Path.GetFileNameWithoutExtension(path);
            if (string.IsNullOrEmpty(fileName) || !fileName.StartsWith("InterestPoint_", StringComparison.OrdinalIgnoreCase))
                continue;

            string key = fileName.Substring("InterestPoint_".Length);

            AudioType audioType = DetectAudioType(Path.GetExtension(path));
            if (audioType == AudioType.UNKNOWN) continue;
            
            string uri = new System.Uri(path).AbsoluteUri;
            using (var req = UnityWebRequestMultimedia.GetAudioClip(uri, audioType))
            {
                ((DownloadHandlerAudioClip)req.downloadHandler).streamAudio = false;

                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    var clip = DownloadHandlerAudioClip.GetContent(req);
                    if (clip != null)
                    {
                        clip.name = fileName;
                        InterestPointAudioClips[key] = clip;
                        
                        int lastUnderscore = key.LastIndexOf('_');
                        if (lastUnderscore > 0 && lastUnderscore < key.Length - 1)
                        {
                            string suffix = key.Substring(lastUnderscore + 1);
                            if (long.TryParse(suffix, out _))
                            {
                                string nameOnly = key.Substring(0, lastUnderscore);
                                if (!InterestPointAudioClips.ContainsKey(nameOnly))
                                {
                                    InterestPointAudioClips[nameOnly] = clip;
                                    Debug.Log($"[AudioPopupController] Mapped extra key '{nameOnly}' from file '{fileName}'");
                                }
                            }
                        }
                    }
                    else
                    {
                        Debug.LogWarning($"Clip null dopo successo richiesta: {path}");
                    }
                }
                else
                {
                    Debug.LogWarning($"Impossibile caricare audio '{path}': {req.error}");
                }
            }
        }

        if (InterestPointAudioClips.Count == 0)
            Debug.LogWarning("Nessun audio trovato nella cartella audio");

        foreach (var kvp in InterestPointAudioClips)
        {
            string key = kvp.Key;
            AudioClip clip = kvp.Value;
            Debug.Log($"[InterestPointAudioClips] Key: {key}, Clip: {(clip != null ? (string.IsNullOrEmpty(clip.name) ? "<no-name>" : clip.name) : "null")}");
        }
    }

    private AudioType DetectAudioType(string ext)
    {
        switch ((ext ?? string.Empty).ToLower())
        {
            case ".wav": return AudioType.WAV;
            case ".mp3": return AudioType.MPEG;
            case ".ogg": return AudioType.OGGVORBIS;
            default: return AudioType.UNKNOWN;
        }
    }
}
