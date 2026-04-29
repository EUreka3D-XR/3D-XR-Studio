using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.Video;

    public class Video_Manager : MonoBehaviour
    {
        private VideoPlayer vp;
        
        public static string actual_Video_URL = "";
        
        private const float TIME_OF_VIDEO_WEBREQUEST = 21f;
        private const float TIME_OF_TRYING_TO_LOAD_VIDEO = 6f;
        
        public static Video_Manager instance;
        
        private Coroutine actualCoroutine;
        
        [SerializeField] private GameObject video_Loading;
        
        private void Awake()
        {
            instance = this;
            vp = GetComponent<VideoPlayer>();
        }
        
        private void OnEnable()
        {
            actualCoroutine = StartCoroutine(playVideoNotYoutube());
            
            video_Loading.SetActive(true);
        }
        
        private void OnDisable()
        {
            if (actualCoroutine != null)
                StopCoroutine(actualCoroutine);
            
            video_Loading.SetActive(false);
        }
        
        private IEnumerator playVideoNotYoutube()
        {
            vp.url = actual_Video_URL;
            UnityWebRequest www = UnityWebRequest.Get(vp.url);
            var requestOperation = www.SendWebRequest();
            
            float requestTimer = 0f;
            while (!requestOperation.isDone && requestTimer < TIME_OF_VIDEO_WEBREQUEST)
            {
                requestTimer += Time.deltaTime;
                yield return null;
            }
            
            if (!requestOperation.isDone)
            {
                Debug.Log("Web request timed out after " + TIME_OF_VIDEO_WEBREQUEST + " seconds.");
                video_Loading.SetActive(false);
                OnLoopPointReached(vp);
                yield break;
            }
            
            if (www.error != null)
            {
                Debug.Log("Video link error");
                video_Loading.SetActive(false);
                OnLoopPointReached(vp);
                yield break;
            }
            
            vp.Prepare();
            
            float timer = 0f;
            while (!vp.isPrepared && timer < TIME_OF_TRYING_TO_LOAD_VIDEO)
            {
                timer += Time.deltaTime;
                yield return null;
            }
            
            if (vp.isPrepared)
            {
                vp.loopPointReached += OnLoopPointReached;
                video_Loading.SetActive(false);
                vp.Play();
            }
            else
            {
                Debug.Log("Video preparation timed out after " + TIME_OF_TRYING_TO_LOAD_VIDEO + " seconds.");
                video_Loading.SetActive(false);
                OnLoopPointReached(vp);
            }
        }
        
        private void OnLoopPointReached(VideoPlayer source)
        {
            vp.loopPointReached -= OnLoopPointReached;
        }
    }