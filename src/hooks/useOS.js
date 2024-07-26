export default (function OS() {
        const userAgent = navigator.userAgent
        if (userAgent.indexOf("Windows NT 10.0") !== -1) return "Windows 10"
        if (userAgent.indexOf("Windows NT 6.2") !== -1) return "Windows 8"
        if (userAgent.indexOf("Windows NT 6.1") !== -1) return "Windows 7"
        if (userAgent.indexOf("Windows NT 6.0") !== -1) return "Windows Vista"
        if (userAgent.indexOf("Windows NT 5.1") !== -1) return "Windows XP"
        if (userAgent.indexOf("Windows NT 5.0") !== -1) return "Windows 2000"
        if (userAgent.indexOf("Mac OS X") !== -1) return "Mac OS X"
        if (userAgent.indexOf("Android") !== -1) return "Android"
        if (userAgent.indexOf("like Mac") !== -1) return "iOS"
        if (userAgent.indexOf("Linux") !== -1) return "Linux"
        return "Unknown"
    }
)()
