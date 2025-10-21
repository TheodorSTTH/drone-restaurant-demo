export function getCookie(name: string) {
    const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return m ? m.pop() as string : "";
}
export const csrftoken = () => getCookie("csrftoken");