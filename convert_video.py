import os
import subprocess

# 目标根目录
ROOT_DIR = r"D:\Media"

# 常见视频扩展名
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".flv", ".wmv", ".webm"}


def is_video(file_name):
    return os.path.splitext(file_name)[1].lower() in VIDEO_EXTENSIONS


def reencode_video(input_path):
    dir_name, file_name = os.path.split(input_path)
    name, ext = os.path.splitext(file_name)

    output_path = os.path.join(dir_name, f"{name}_reencoded.mp4")

    # ffmpeg 命令
    cmd = [
        r'D:\ffmpeg-6.1.1-essentials_build\bin\ffmpeg',
        "-y",  # 覆盖输出文件
        "-i", input_path,
        "-r", "25",                # 帧率
        "-b:v", "1M",              # 视频比特率
        "-c:v", "h264_nvenc",         # 视频编码
        "-preset", "medium",
        "-c:a", "copy",
        output_path
    ]

    try:
        print(f"Processing: {input_path}")
        result = subprocess.run(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        if result.returncode == 0 and os.path.exists(output_path):
            os.remove(input_path)
            print(f"Done & deleted original: {input_path}")
        else:
            print(f"Failed: {input_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")


def main():
    for root, dirs, files in os.walk(ROOT_DIR):
        for file in files:
            if is_video(file):
                full_path = os.path.join(root, file)
                reencode_video(full_path)


if __name__ == "__main__":
    main()
