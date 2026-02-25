using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using SkiaSharp;

#if DEBUG
Directory.SetCurrentDirectory(@"D:\Fork\BOTC_TokenMaker\Example");
#endif
// ================== 默认配置（会被config.json覆盖）==================
var DEFAULT_CONFIG = new Dictionary<string, object>
{
    ["show_cut_guide"] = true, // 默认显示裁切指示线
    ["canvas_padding"] = 2 // 默认画布向外扩展2像素
};

string configPath = "config.json";

// 解析命令行参数
for (int i = 0; i < args.Length; i++)
{
    if (args[i] == "--config" && i + 1 < args.Length)
        configPath = args[++i];
}

var config = LoadConfig(configPath);

// 从配置文件读取是否显示裁切指示线
bool showGuide = true;
if (config.TryGetProperty("show_cut_guide", out var showGuideElement))
{
    showGuide = showGuideElement.GetBoolean();
}

// 从配置文件读取画布扩展值
int canvasPadding = 2;
if (config.TryGetProperty("canvas_padding", out var paddingElement))
{
    canvasPadding = paddingElement.GetInt32();
}

// 命令行参数可以覆盖配置文件
for (int i = 0; i < args.Length; i++)
{
    if (args[i] == "--no-guide")
        showGuide = false;
    else if (args[i] == "--guide")
        showGuide = true;
    else if (args[i] == "--padding" && i + 1 < args.Length)
        canvasPadding = int.Parse(args[++i]);
}

string fontPath = config.GetProperty("font").GetProperty("path").GetString();
if (!File.Exists(fontPath))
{
    throw new Exception($"❌ 找不到字体文件：{fontPath}");
}

string jsonPath = config.GetProperty("json_path").GetString();

// 获取所有需要处理的JSON文件
List<string> jsonFiles = new List<string>();

if (Directory.Exists(jsonPath))
{
    // 如果是文件夹，获取所有.json文件
    Console.WriteLine($"📁 检测到文件夹：{jsonPath}");
    jsonFiles = Directory.GetFiles(jsonPath, "*.json", SearchOption.TopDirectoryOnly).ToList();

    if (jsonFiles.Count == 0)
    {
        throw new Exception($"❌ 文件夹中没有找到JSON文件：{jsonPath}");
    }

    Console.WriteLine($"📋 找到 {jsonFiles.Count} 个JSON文件");
}
else if (File.Exists(jsonPath))
{
    // 如果是单个文件
    jsonFiles.Add(jsonPath);
    Console.WriteLine($"📄 处理单个JSON文件：{jsonPath}");
}
else
{
    throw new Exception($"❌ 找不到JSON文件或文件夹：{jsonPath}");
}

if (config.GetProperty("background").GetProperty("type").GetString() == "image")
{
    var bgImagePath = config.GetProperty("background").GetProperty("image_path");
    if (bgImagePath.ValueKind != JsonValueKind.Null)
    {
        string bgPath = bgImagePath.GetString();
        if (!string.IsNullOrEmpty(bgPath) && !File.Exists(bgPath))
        {
            Console.WriteLine($"⚠️ 背景图片不存在：{bgPath}，将使用纯色背景");
        }
    }
}

string baseOutputDir = config.GetProperty("output_dir").GetString();

int dpi = config.GetProperty("dpi").GetInt32();
double tokenDiameterInch = config.GetProperty("token_diameter_inch").GetDouble();
int tokenPx = (int)(tokenDiameterInch * dpi);

var typeface = SKTypeface.FromFile(fontPath);
int fontSize = config.GetProperty("font").GetProperty("size").GetInt32();

using var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");
int timeout = config.GetProperty("timeout").GetInt32();
httpClient.Timeout = TimeSpan.FromSeconds(timeout);

bool isStrict = config.GetProperty("strict").GetBoolean();

Console.WriteLine($"⚙️ 画布扩展设置：{canvasPadding} 像素");

int totalSuccess = 0;
int totalFail = 0;

// 处理每个JSON文件
foreach (var currentJsonPath in jsonFiles)
{
    string jsonName = Path.GetFileNameWithoutExtension(currentJsonPath);
    string outputDir = Path.Combine(baseOutputDir, jsonName);
    Directory.CreateDirectory(outputDir);

    Console.WriteLine($"\n{'=',60}");
    Console.WriteLine($"🎯 开始处理：{jsonName}");
    Console.WriteLine($"{'=',60}");

    string jsonContent = File.ReadAllText(currentJsonPath);
    var data = JsonSerializer.Deserialize<List<JsonElement>>(jsonContent);

    if (data == null || data.Count == 0)
    {
        Console.WriteLine($"⚠️ JSON文件为空或格式错误：{currentJsonPath}\n");
        continue;
    }

    int successCount = 0;
    int failCount = 0;

    for (int i = 0; i < data.Count; i++)
    {
        var entry = data[i];

        if (!entry.TryGetProperty("image", out var imageUrlElement) ||
            !entry.TryGetProperty("name", out var nameElement))
        {
            failCount++;
            continue;
        }

        string imageUrl = imageUrlElement.GetString();
        string name = nameElement.GetString();
        string schTeam = entry.TryGetProperty("sch_team", out var teamElement)
            ? teamElement.GetString()
            : "";

        if (string.IsNullOrEmpty(schTeam))
        {
            schTeam = entry.TryGetProperty("team", out teamElement)
                ? teamElement.GetString()
                : "";
        }

        if (isStrict && IsToken(schTeam) == false)
            continue;

        if (string.IsNullOrEmpty(imageUrl) || string.IsNullOrEmpty(name))
        {
            failCount++;
            continue;
        }

        string safeName = SafeFilename(name);
        string outputPath = Path.Combine(outputDir, $"{safeName}_token.png");

        try
        {
            Console.WriteLine($"⬇️ [{i + 1}/{data.Count}] 下载图片：{name}");
            var imageData = await httpClient.GetByteArrayAsync(imageUrl);
            using var image = SKBitmap.Decode(imageData);

            CreateSingleToken(image, name, schTeam, outputPath, tokenPx,
                typeface, fontSize, config, showGuide, canvasPadding);

            Console.WriteLine($"✅ 已生成：{safeName}_token.png\n");
            successCount++;
        }
        catch (Exception e)
        {
            Console.WriteLine($"❌ 处理失败 [{name}]：{e.Message}\n");
            failCount++;
        }
    }

    Console.WriteLine($"📊 [{jsonName}] 完成！成功 {successCount} 个，失败 {failCount} 个");
    Console.WriteLine($"📂 输出目录：{outputDir}");

    totalSuccess += successCount;
    totalFail += failCount;
}

Console.WriteLine($"\n{'=',60}");
Console.WriteLine($"🎉 全部完成！总计：成功 {totalSuccess} 个，失败 {totalFail} 个");
Console.WriteLine($"📂 输出根目录：{baseOutputDir}");
Console.WriteLine($"{'=',60}");
// 汇总去重
if (jsonFiles.Count > 1)
{
    Console.WriteLine("\n📦 开始汇总去重...");
    string mergedDir = MergeAndDeduplicateTokens(baseOutputDir);
    Console.WriteLine($"✅ 汇总完成！合并后目录：{mergedDir}");
}
// ================ 函数定义 ================

JsonElement LoadConfig(string configPath)
{
    if (File.Exists(configPath))
    {
        Console.WriteLine($"📝 加载配置文件：{configPath}");
        string json = File.ReadAllText(configPath);
        return JsonDocument.Parse(json).RootElement;
    }
    else
    {
        Console.WriteLine($"📝 配置文件不存在：{configPath}");
        return default;
    }
}

string SafeFilename(string name)
{
    return Regex.Replace(name, @"[\\/:*?""<>|]", "_");
}

SKBitmap MakeCircle(SKBitmap image, int size)
{
    var result = new SKBitmap(size, size, SKColorType.Rgba8888, SKAlphaType.Premul);
    using (var canvas = new SKCanvas(result))
    using (var paint = new SKPaint { IsAntialias = true, FilterQuality = SKFilterQuality.High })
    {
        canvas.Clear(SKColors.Transparent);
        var destRect = new SKRect(0, 0, size, size);
        canvas.DrawBitmap(image, destRect, paint);
    }

    return result;
}

bool IsToken(string schTeam)
{
    schTeam = schTeam.Trim();

    if (schTeam == "镇民" || schTeam == "外来者" || schTeam == "townsfolk" || schTeam == "outsider")
    {
        return true;
    }
    else if (schTeam == "爪牙" || schTeam == "恶魔" || schTeam == "minion" || schTeam == "demon")
    {
        return true;
    }

    return false;
}

string GetTextSuffix(string schTeam, JsonElement config)
{
    schTeam = schTeam.Trim();

    if (schTeam == "镇民" || schTeam == "外来者" || schTeam == "townsfolk" || schTeam == "outsider")
    {
        return "blue";
    }
    else if (schTeam == "爪牙" || schTeam == "恶魔" || schTeam == "minion" || schTeam == "demon")
    {
        return "red";
    }
    else
    {
        return "blue";
    }
}
SKColor GetTextColor(string schTeam, JsonElement config)
{
    var colors = config.GetProperty("text").GetProperty("colors");

    if (string.IsNullOrWhiteSpace(schTeam))
    {
        return GetSKColor(colors.GetProperty("neutral"));
    }

    schTeam = schTeam.Trim();

    if (schTeam == "镇民" || schTeam == "外来者" || schTeam == "townsfolk" || schTeam == "outsider")
    {
        return GetSKColor(colors.GetProperty("blue"));
    }
    else if (schTeam == "爪牙" || schTeam == "恶魔" || schTeam == "minion" || schTeam == "demon")
    {
        return GetSKColor(colors.GetProperty("red"));
    }
    else
    {
        return GetSKColor(colors.GetProperty("neutral"));
    }
}

SKColor GetSKColor(JsonElement colorArray)
{
    var arr = colorArray.EnumerateArray().Select(x => x.GetInt32()).ToArray();
    return new SKColor((byte)arr[0], (byte)arr[1], (byte)arr[2]);
}

SKBitmap CreateBackground(int canvasSize, JsonElement config)
{
    var bgConfig = config.GetProperty("background");
    var bgType = bgConfig.GetProperty("type").GetString();

    if (bgType == "image")
    {
        var imagePathElement = bgConfig.GetProperty("image_path");
        if (imagePathElement.ValueKind != JsonValueKind.Null)
        {
            string imagePath = imagePathElement.GetString();
            if (!string.IsNullOrEmpty(imagePath) && File.Exists(imagePath))
            {
                try
                {
                    using var original = SKBitmap.Decode(imagePath);
                    var resized = new SKBitmap(canvasSize, canvasSize);
                    using (var canvas = new SKCanvas(resized))
                    using (var paint = new SKPaint { IsAntialias = true, FilterQuality = SKFilterQuality.High })
                    {
                        canvas.DrawBitmap(original, new SKRect(0, 0, canvasSize, canvasSize), paint);
                    }

                    return resized;
                }
                catch (Exception e)
                {
                    Console.WriteLine($"背景加载失败: {e.Message}，改用纯透明");
                }
            }
        }
    }

    var bitmap = new SKBitmap(canvasSize, canvasSize);
    using (var canvas = new SKCanvas(bitmap))
    {
        if (bgType == "color")
        {
            var color = GetSKColor(bgConfig.GetProperty("color"));
            canvas.Clear(color);
        }
        else
        {
            canvas.Clear(SKColors.Transparent);
        }
    }

    return bitmap;
}

void CreateSingleToken(SKBitmap image, string name, string schTeam,
    string outputPath, int tokenPx, SKTypeface typeface, int fontSize,
    JsonElement config, bool showGuide, int canvasPadding)
{
    // 计算实际画布大小（原始尺寸 + 四周扩展）
    int contentSize = tokenPx;
    int canvasSize = tokenPx + (canvasPadding * 2);

    using var bgBitmap = CreateBackground(contentSize, config);
    using var surface = SKSurface.Create(new SKImageInfo(
        canvasSize, canvasSize, SKColorType.Rgba8888, SKAlphaType.Premul));

    var drawCanvas = surface.Canvas;

    // 清空画布为透明
    drawCanvas.Clear(SKColors.Transparent);

    // 绘制背景（居中放置，考虑padding偏移）
    drawCanvas.DrawBitmap(bgBitmap, canvasPadding, canvasPadding);

    // ===== 图片参数 =====
    double imageScale = config.GetProperty("image").GetProperty("scale").GetDouble();
    double imageYOffset = config.GetProperty("image").GetProperty("y_offset_ratio").GetDouble();

    int circleSize = (int)(contentSize * imageScale);
    using var circle = MakeCircle(image, circleSize);

    // 计算图片位置（考虑padding偏移）
    int circleX = (contentSize - circleSize) / 2 + canvasPadding;
    int circleY = (contentSize - circleSize) / 2 + (int)(contentSize * imageYOffset) + canvasPadding;

    drawCanvas.DrawBitmap(circle, circleX, circleY);

    // ===== 文字配置 =====
    var textCfg = config.GetProperty("text");

    var strokeColor = GetSKColor(textCfg.GetProperty("stroke").GetProperty("color"));
    int strokeWidth = textCfg.GetProperty("stroke").GetProperty("width").GetInt32();

    int shadowOffsetY = textCfg.GetProperty("inner_shadow").GetProperty("offset_y").GetInt32();
    int shadowAlpha = textCfg.GetProperty("inner_shadow").GetProperty("alpha").GetInt32();
    var shadowColor = new SKColor(0, 0, 0, (byte)shadowAlpha);

    var textColor = GetTextColor(schTeam, config);

    bool useGradient = textCfg.TryGetProperty("use_gradient", out var g) && g.GetBoolean();

    using var paint = new SKPaint
    {
        Typeface = typeface,
        TextSize = fontSize,
        IsAntialias = true,
        SubpixelText = true
    };

    int charCount = name.Length;
    bool useCurve = textCfg.GetProperty("use_curve").GetBoolean();
    
    // ===== 单字居中 =====
    if (useCurve && charCount == 1)
    {
        float centerX = contentSize / 2f + canvasPadding;
        float centerY = contentSize * (float)textCfg.GetProperty("single_char_y").GetDouble() + canvasPadding;

        var bounds = new SKRect();
        paint.MeasureText(name, ref bounds);

        float textX = centerX - bounds.MidX;
        float textY = centerY - bounds.MidY;

        // 阴影
        paint.Style = SKPaintStyle.Fill;
        paint.Color = shadowColor;
        drawCanvas.DrawText(name, textX, textY + shadowOffsetY, paint);

        // 描边
        paint.Style = SKPaintStyle.Stroke;
        paint.StrokeWidth = strokeWidth;
        paint.Color = strokeColor;
        drawCanvas.DrawText(name, textX, textY, paint);

        // 填充（渐变 or 纯色）
        paint.Style = SKPaintStyle.Fill;

        if (useGradient)
        {
            paint.Shader = CreateTextGradientShader(textCfg, bounds, GetTextSuffix(schTeam, config));
        }
        else
        {
            paint.Shader = null;
            paint.Color = textColor;
        }

        drawCanvas.DrawText(name, textX, textY, paint);
    }
    else
    {
        // ===== 弧形文字 =====
        if (useCurve)
        {
            float centerX = contentSize / 2f + canvasPadding;
            float centerY = contentSize / 2f + canvasPadding;

            var curveCfg = textCfg.GetProperty("curve");
            float arcRadius = contentSize * (float)curveCfg.GetProperty("radius_ratio").GetDouble();

            double arcAngleBase = curveCfg.GetProperty("arc_angle_base").GetDouble();
            double arcAngleIncrement = curveCfg.GetProperty("arc_angle_increment").GetDouble();
            double arcAngleMax = curveCfg.GetProperty("arc_angle_max").GetDouble();

            double arcAngle = Math.Min(
                arcAngleBase + (charCount - 2) * arcAngleIncrement,
                arcAngleMax);

            double startAngle = 180 - (90 - arcAngle / 2);
            double angleStep = -arcAngle / Math.Max(charCount - 1, 1);

            for (int i = 0; i < name.Length; i++)
            {
                string ch = name[i].ToString();

                double angle = startAngle + i * angleStep;
                double rad = angle * Math.PI / 180;

                float charX = centerX + arcRadius * (float)Math.Cos(rad);
                float charY = centerY + arcRadius * (float)Math.Sin(rad);

                var bounds = new SKRect();
                paint.MeasureText(ch, ref bounds);

                float textX = charX - bounds.MidX;
                float textY = charY - bounds.MidY;

                // 阴影
                paint.Style = SKPaintStyle.Fill;
                paint.Color = shadowColor;
                drawCanvas.DrawText(ch, textX, textY + shadowOffsetY, paint);

                // 描边
                paint.Style = SKPaintStyle.Stroke;
                paint.StrokeWidth = strokeWidth;
                paint.Color = strokeColor;
                drawCanvas.DrawText(ch, textX, textY, paint);

                // 填充
                paint.Style = SKPaintStyle.Fill;

                if (useGradient)
                    paint.Shader = CreateTextGradientShader(textCfg, bounds, GetTextSuffix(schTeam, config));
                else
                {
                    paint.Shader = null;
                    paint.Color = textColor;
                }

                drawCanvas.DrawText(ch, textX, textY, paint);
            }
        }
        // ===== 直线文字 =====
        else
        {
            var lineCfg = textCfg.GetProperty("line");

            float spacing = lineCfg.GetProperty("spacing").GetSingle();
            float charY = lineCfg.GetProperty("char_y").GetSingle();
            float offsetY = lineCfg.GetProperty("offset_y").GetSingle();

            float centerX = contentSize / 2f + canvasPadding;

            float totalWidth = 0f;
            var bounds = new SKRect();

            var expandWidth = name.Length >= 4 ? name.Length - 3 : 0;
            var font_size=fontSize-expandWidth * 2;
            paint.TextSize = font_size;
            spacing-=expandWidth * 0.75f;
            
            foreach (char c in name)
            {
                paint.MeasureText(c.ToString(), ref bounds);
                totalWidth += bounds.Width;
            }

            totalWidth += (name.Length - 1) * spacing;

            float startX = centerX - totalWidth / 2;
            float y = contentSize * (charY - offsetY * (name.Length >=4?name.Length-3 :0)) + canvasPadding;

            for (int i = 0; i < name.Length; i++)
            {
                string ch = name[i].ToString();
                paint.MeasureText(ch, ref bounds);

                float textX = startX - bounds.Left;
                float textY = y - bounds.MidY;

                // 阴影
                paint.Style = SKPaintStyle.Fill;
                paint.Color = shadowColor;
                drawCanvas.DrawText(ch, textX, textY + shadowOffsetY, paint);

                // 描边
                paint.Style = SKPaintStyle.Stroke;
                paint.StrokeWidth = strokeWidth;
                paint.Color = strokeColor;
                drawCanvas.DrawText(ch, textX, textY, paint);

                // 填充
                paint.Style = SKPaintStyle.Fill;

                if (useGradient)
                {
                    var textRect = new SKRect(
                        textX,
                        textY + bounds.Top,
                        textX + bounds.Width,
                        textY + bounds.Bottom
                    );

                    paint.Shader = CreateTextGradientShader(textCfg, textRect, GetTextSuffix(schTeam, config));
                }
                else
                {
                    paint.Shader = null;
                    paint.Color = textColor;
                }

                drawCanvas.DrawText(ch, textX, textY, paint);
                
                paint.Shader = null;

                startX += bounds.Width + spacing;
            }
        }
    }

    if (showGuide)
    {
        float padding= config.GetProperty("cut_guide").GetProperty("padding").GetSingle();
        
        float maxCircleDiameter = contentSize -padding*2;
        int dashLength = 10;
        int gapLength = 10;

        double circumference = Math.PI * maxCircleDiameter;
        double totalLength = dashLength + gapLength;
        int numSegments = (int)(circumference / totalLength);

        var guideColor = GetSKColor(config.GetProperty("cut_guide").GetProperty("color"));
        int guideWidth = config.GetProperty("cut_guide").GetProperty("width").GetInt32();

        
        using var guidePaint = new SKPaint
        {
            Color = guideColor,
            Style = SKPaintStyle.Stroke,
            StrokeWidth = guideWidth,
            IsAntialias = true
        };

        // 裁切线绘制时考虑padding偏移
        var rect = new SKRect(canvasPadding+ padding, canvasPadding+ padding, 
                             canvasPadding+ padding + maxCircleDiameter, 
                             canvasPadding+ padding + maxCircleDiameter);

        for (int i = 0; i < numSegments; i++)
        {
            float startAngleVal = (float)((i * totalLength / circumference) * 360);
            float sweepAngle = (float)((dashLength / circumference) * 360);

            using var path = new SKPath();
            path.AddArc(rect, startAngleVal, sweepAngle);
            drawCanvas.DrawPath(path, guidePaint);
        }
    }

    using var img = surface.Snapshot();
    using var data = img.Encode(SKEncodedImageFormat.Png, 100);
    using var stream = File.OpenWrite(outputPath);
    data.SaveTo(stream);
}

string MergeAndDeduplicateTokens(string baseOutputDir)
{
    // 创建合并目录
    string mergedDir = Path.Combine(baseOutputDir, "_merged");
    Directory.CreateDirectory(mergedDir);

    // 获取所有子文件夹（排除_merged自身）
    var subDirs = Directory.GetDirectories(baseOutputDir)
        .Where(d => Path.GetFileName(d) != "_merged")
        .ToList();

    if (subDirs.Count == 0)
    {
        Console.WriteLine("⚠️ 没有找到需要合并的子文件夹");
        return mergedDir;
    }

    // 用于去重的字典：文件哈希 -> 文件路径
    var fileHashMap = new Dictionary<string, string>();
    // 用于存储基础文件名（去除_1, _2等后缀）的哈希映射
    var baseNameHashMap = new Dictionary<string, string>();
    int duplicateCount = 0;
    int copiedCount = 0;

    foreach (var subDir in subDirs)
    {
        var pngFiles = Directory.GetFiles(subDir, "*_token.png");
        
        foreach (var file in pngFiles)
        {
            string fileName = Path.GetFileName(file);
            
            // 提取基础文件名（去除_1, _2等后缀）
            string baseName = GetBaseFileName(fileName);
            
            // 计算文件哈希用于去重
            string fileHash = ComputeFileHash(file);
            
            if (fileHashMap.ContainsKey(fileHash))
            {
                // 重复文件，跳过
                duplicateCount++;
                Console.WriteLine($"⏭️ 跳过重复：{fileName}");
            }
            else if (baseNameHashMap.ContainsKey(baseName))
            {
                // 基础文件名相同，检查哈希是否相同
                duplicateCount++;
                Console.WriteLine($"⏭️ 跳过重复（后缀不同）：{fileName}");
            }
            else
            {
                // 新文件，使用基础文件名复制
                string destPath = Path.Combine(mergedDir, baseName + "_token.png");
                File.Copy(file, destPath, true);
                fileHashMap[fileHash] = destPath;
                baseNameHashMap[baseName] = fileHash;
                copiedCount++;
                Console.WriteLine($"📋 复制：{fileName} -> {Path.GetFileName(destPath)}");
            }
        }
    }

    Console.WriteLine($"\n📊 去重统计：");
    Console.WriteLine($"   - 复制文件：{copiedCount} 个");
    Console.WriteLine($"   - 跳过重复：{duplicateCount} 个");
    Console.WriteLine($"   - 合并总数：{fileHashMap.Count} 个");

    return mergedDir;
}

string GetBaseFileName(string fileName)
{
    // 移除 _token.png 后缀
    string nameWithoutExt = fileName.Replace("_token.png", "");
    
    // 使用正则表达式移除末尾的 _数字 后缀
    // 例如: "洗衣妇_1" -> "洗衣妇", "间谍_23" -> "间谍"
    string baseName = Regex.Replace(nameWithoutExt, @"_\d+$", "");
    
    return baseName;
}

string GetUniqueFileName(string directory, string baseName, string suffix)
{
    string fileName = baseName + suffix;
    string destPath = Path.Combine(directory, fileName);
    
    // 如果文件名已存在，添加数字后缀
    if (File.Exists(destPath))
    {
        int counter = 1;
        while (File.Exists(destPath))
        {
            destPath = Path.Combine(directory, $"{baseName}_{counter}{suffix}");
            counter++;
        }
    }
    
    return destPath;
}

string ComputeFileHash(string filePath)
{
    using var sha256 = System.Security.Cryptography.SHA256.Create();
    using var stream = File.OpenRead(filePath);
    byte[] hash = sha256.ComputeHash(stream);
    return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
}

SKShader CreateTextGradientShader(JsonElement textCfg, SKRect bounds, string suffix)
{
    var grad = textCfg.GetProperty($"gradient_{suffix}");

    var colors = grad.GetProperty("colors")
        .EnumerateArray()
        .Select(c =>
        {
            var arr = c.EnumerateArray().Select(x => (byte)x.GetInt32()).ToArray();
            return new SKColor(arr[0], arr[1], arr[2]);
        })
        .ToArray();

    var positions = grad.GetProperty("positions")
        .EnumerateArray()
        .Select(p => p.GetSingle())
        .ToArray();

    float angle = grad.GetProperty("angle").GetSingle();
    float rad = angle * (float)Math.PI / 180f;

    var start = new SKPoint(bounds.MidX, bounds.MidY);
    var end = new SKPoint(
        start.X + (float)Math.Cos(rad) * bounds.Width,
        start.Y + (float)Math.Sin(rad) * bounds.Height
    );

    return SKShader.CreateLinearGradient(
        start,
        end,
        colors,
        positions,
        SKShaderTileMode.Clamp
    );
}