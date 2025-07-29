import requests
import json
import argparse
import os
from getpass import getpass

# 从环境变量或命令行参数获取API URL
API_URL = os.environ.get("CLEANUP_API_URL", "http://localhost:3000/api/cleanup")

def main():
    parser = argparse.ArgumentParser(
        description="A tool to trigger cleanup tasks on the Next-Secure-Share API.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument(
        "tasks",
        nargs='*',
        choices=['ips', 'logs', 'files', 'all'],
        help="""Space-separated list of tasks to perform.
'ips':   Clean up orphan IP lock keys.
'logs':  Clean up all log keys.
'files': Clean up orphan blob storage files.
'all':   Perform all available tasks."""
    )
    
    parser.add_argument(
        "--url",
        default=API_URL,
        help=f"The API endpoint URL. (Default: {API_URL})"
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform a dry run. The API will report what it would do without making changes."
    )
    
    parser.add_argument(
        "-p", "--password",
        help="Admin password. If not provided, it will be prompted for securely."
    )
    
    args = parser.parse_args()
    
    if not args.tasks:
        print("Error: You must specify at least one task.")
        parser.print_help()
        return

    # 处理 'all' 选项
    tasks_to_run = args.tasks
    if 'all' in tasks_to_run:
        tasks_to_run = ['ips', 'logs', 'files']

    # 获取密码
    admin_password = args.password
    if not admin_password:
        try:
            admin_password = getpass("Enter Admin Password: ")
        except (KeyboardInterrupt, EOFError):
            print("\nOperation cancelled.")
            return

    # 构建请求体
    payload = {
        "adminPassword": admin_password,
        "tasks": list(set(tasks_to_run)), # 去重
        "dryRun": args.dry_run
    }
    
    print(f"\n🚀 Sending request to {args.url}...")
    print(f"   Tasks: {payload['tasks']}")
    if args.dry_run:
        print("   Mode:  DRY RUN (no changes will be made)")
    else:
        print("   Mode: LIVE RUN (changes WILL be made)")
        
    print("-" * 30)

    try:
        response = requests.post(args.url, json=payload, timeout=300) # 5分钟超时
        response.raise_for_status() # 如果状态码是 4xx or 5xx，则抛出异常
        
        print("✅ Request successful!")
        print("\n--- API Report ---")
        # 使用json.dumps美化输出
        report_data = response.json()
        print(json.dumps(report_data, indent=2))
        
    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTP Error: {e.response.status_code}")
        try:
            error_details = e.response.json()
            print("   Error details:", json.dumps(error_details, indent=2))
        except json.JSONDecodeError:
            print("   Could not decode error response from server.")
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()