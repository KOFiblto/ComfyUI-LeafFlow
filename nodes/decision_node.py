import os
import threading
import subprocess
from server import PromptServer
from aiohttp import web
import comfy.model_management

class DecisionManager:
    _waiting_events = {}
    _actions = {}

    @classmethod
    def register_wait(cls, unique_id, event):
        cls._waiting_events[unique_id] = event
        cls._actions[unique_id] = "continue"

    @classmethod
    def unregister_wait(cls, unique_id):
        if unique_id in cls._waiting_events:
            del cls._waiting_events[unique_id]
        if unique_id in cls._actions:
            del cls._actions[unique_id]

    @classmethod
    def get_action(cls, unique_id):
        action = cls._actions.get(unique_id, "continue")
        cls.unregister_wait(unique_id)
        return action

    @classmethod
    def trigger_action(cls, unique_id, action):
        if unique_id in cls._waiting_events:
            cls._actions[unique_id] = action
            cls._waiting_events[unique_id].set()
            return True
        return False


class FlowControlDecision:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "disable": ("BOOLEAN", {"default": False}),
                "send_os_notification": ("BOOLEAN", {"default": False}),
                "timeout": ("INT", {"default": -1, "min": -1, "max": 3600}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("BOOLEAN",)
    RETURN_NAMES = ("cancel",)
    FUNCTION = "decide"
    CATEGORY = "🍃 FlowControl"
    DESCRIPTION = "Pauses execution and waits for your input via the UI buttons.\n\n- 'Continue' outputs False (0).\n- 'Cancel' outputs True (1) so you can route it into a Switch node to bypass later nodes.\n- 'Stop Workflow' instantly aborts the entire ComfyUI generation queue.\n- 'OS Notification': Sends a native desktop toast (Windows/macOS/Linux) when waiting."

    def send_notification(self, title, message):
        try:
            if os.name == 'nt':
                # Windows native PowerShell Toast Notification
                ps_script = f"""
$ErrorActionPreference = 'Stop'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$template = @"
<toast>
    <visual>
        <binding template="ToastText02">
            <text id="1">{title}</text>
            <text id="2">{message}</text>
        </binding>
    </visual>
</toast>
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("ComfyUI").Show($toast)
"""
                subprocess.Popen(["powershell", "-NoProfile", "-Command", ps_script], creationflags=subprocess.CREATE_NO_WINDOW)
            elif os.uname().sysname == 'Darwin':
                # macOS native AppleScript Notification
                escape_title = title.replace('"', '\\"')
                escape_message = message.replace('"', '\\"')
                apple_script = f'display notification "{escape_message}" with title "{escape_title}"'
                subprocess.Popen(["osascript", "-e", apple_script])
            else:
                # Linux dbus notify-send
                subprocess.Popen(["notify-send", title, message])
        except Exception as e:
            print(f"[FlowControl] Failed to send OS notification: {e}")

    def decide(self, disable, send_os_notification, timeout, unique_id=None):
        if disable:
            return (False,)

        if not unique_id:
            return (False,)

        # Notify frontend
        PromptServer.instance.send_sync("flowcontrol_decision_waiting", {"node_id": unique_id})

        if send_os_notification:
            self.send_notification("ComfyUI FlowControl", "Workflow paused! Waiting for your decision.")

        # Wait for user input
        event = threading.Event()
        DecisionManager.register_wait(unique_id, event)

        print(f"[FlowControl] Node {unique_id} is waiting for user decision...")

        if timeout > 0:
            waited = event.wait(timeout)
            if not waited:
                print(f"[FlowControl] Node {unique_id} timed out. Auto-continuing...")
                DecisionManager.unregister_wait(unique_id)
                # Notify frontend to update UI back to normal
                PromptServer.instance.send_sync("flowcontrol_decision_resolved", {"node_id": unique_id})
                return (False,)
        else:
            event.wait()

        # Retrieve action
        action = DecisionManager.get_action(unique_id)
        
        # Notify frontend that the decision has been resolved
        PromptServer.instance.send_sync("flowcontrol_decision_resolved", {"node_id": unique_id})

        if action == "cancel":
            print(f"[FlowControl] Node {unique_id} cancelled.")
            return (True,)
        elif action == "stop":
            print(f"[FlowControl] Node {unique_id} stopped workflow.")
            try:
                # Attempt to cancel current execution queue
                PromptServer.instance.prompt_queue.cancel_current_execution()
            except:
                pass
            # Raise exception to halt this thread instantly
            try:
                raise comfy.model_management.InterruptProcessingException("Workflow stopped by FlowControl Decision Node.")
            except AttributeError:
                raise Exception("Workflow stopped by FlowControl Decision Node.")

        print(f"[FlowControl] Node {unique_id} continuing.")
        return (False,)


# Register API Route
@PromptServer.instance.routes.post("/flowcontrol/decision")
async def handle_decision(request):
    try:
        data = await request.json()
        node_id = data.get("node_id")
        action = data.get("action")

        if DecisionManager.trigger_action(node_id, action):
            return web.json_response({"status": "ok"})
        else:
            return web.json_response({"status": "error", "message": "Node is not waiting."}, status=400)
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)
