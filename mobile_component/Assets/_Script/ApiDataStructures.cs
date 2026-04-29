using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Struttura dati principale ricevuta dalle API
/// </summary>
[Serializable]
public class ApiResponseData
{
    public TotemData totem;
    public EnvironmentData environment;
    public List<ObjectTransformData> objects;
    public List<PathPointData> path_points;
    public List<ApiInterestPointData> interest_points;
}

[Serializable]
public class TotemData
{
    public string serial_code;
    public string label;
    public PositionGPS position_gps;
}

[Serializable]
public class EnvironmentData
{
    public int id;
    public string name;
    public PositionCoord position;
    public SurfaceArea surface_area;
}

[Serializable]
public class PositionCoord
{
    public string lat;
    public string lng;
}

[Serializable]
public class SurfaceArea
{
    public Corner topLeft;
    public Corner topRight;
    public Corner bottomLeft;
    public Corner bottomRight;
}

[Serializable]
public class Corner
{
    public string lat;
    public string lng;
}

[Serializable]
public class PositionGPS
{
    public float latitude;
    public float longitude;
}

[Serializable]
public class ObjectTransformData_Parent
{
    public List<ObjectTransformData> objects;
    public List<PathPointData> path_points;
    public List<ApiInterestPointData> interest_points;
}

/// <summary>
/// Dati Interest Point ricevuti dalle API
/// </summary>
[Serializable]
public class ApiInterestPointData
{
    public int id;
    public int position;
    public string interestPoint_Name;
    public interestPoint_Text_Multilanguage interestPoint_Title_Text;
    public interestPoint_Text_Multilanguage interestPoint_Description_Text;
    public string interestPoint_Video_URL;
    public string interestPoint_Text_Content;
    public string interestPoint_URL;
    public Vector3 mascottePosition;
    public PositionGPS position_gps;
    
    // Questi vengono popolati dal parsing dell'array media
    public List<string> interestPoint_Image_URLs;
    public List<string> interestPoint_Audio_URLs;
    
    // Array media completo dalla API
    public List<MediaData> media;
}

[Serializable]
public class interestPoint_Text_Multilanguage
{
    public string en;
    public string it;
    public string es;
    public string ca; //catalano
    public string fr;
    public string el; //greco
    public string de;
    public string ru;
    public string zh;
}

/// <summary>
/// Dati di un singolo media
/// </summary>
[Serializable]
public class MediaData
{
    public int id;
    public string type;  // "image", "audio", "video"
    public string lang;  // "it", "en", etc.
    public string title;
    public string url;
    public string download_url;
    public string content;
    public string created_at;
}
