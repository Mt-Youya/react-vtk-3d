import { keys,archWidthStore } from "@/store/archWidth";
import NewInstances from "@/store/NewInstances"
import TriggerScene from "@/store"
const kMapInfo = {
    sharp:"archWidthFangs",
    frontMolar: "archWidthPremolar",
    molar: "archWidthMolar"
}

export default class ArchWidth {
    #container = null
    #archBox = null
    #type = null
    #pos = null
    #name = null
    #tag = null
    constructor(container,type,pos,name){
        if(type != "up" && type != "down" ) type = "up"
        if(!keys.includes(pos)) pos = keys[0]
        const archBox = document.createElement('div')
        const tag = document.createElement('span')
        tag.style = 'font-size:12px;background-color:#fff;padding:2px 12px;position:absolute;top:0;left:0;white-space: nowrap;opacity:0;'
        tag.innerText = name
        archBox.append(tag)
        const boundingRect = container.getBoundingClientRect()
        archBox.style = `position: absolute; left: 0; bottom: 0; width:${boundingRect.width}px;height:${boundingRect.height}px;cursor:default;`
        container.insertAdjacentElement("afterend",archBox)
        this.#container = container;
        this.#archBox = archBox;
        this.#type = type
        this.#pos = pos
        this.#name = name
        this.#tag = tag
        this.#init()
    }
    #init(){
        const _T = this;
        let clickCount = 0
        function getMousePosition(e){
            const rect = _T.#container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            return {x,y}
        }

        this.#archBox.addEventListener("click",(e)=>{
            const type = _T.#type,pos = _T.#pos,name = _T.#name
            const { x, y } = getMousePosition(e);
            const { getScreenMapModelPos, addToothWidthLabels } = TriggerScene.context
            const dpr = window.devicePixelRatio || 1
            const p = getScreenMapModelPos({
                x: x * dpr,
                y: (this.#container.clientHeight - y) * dpr,
            })
            if(!p[0]&&!p[1]&&!p[2]) return
            archWidthStore[type][pos].points[clickCount] = p
            const {points} = archWidthStore[type][pos]
            const [p1,p2] = points
            if(clickCount){
                const val = Math.sqrt(Math.pow(p2[0] - p1[0],2) + Math.pow(p2[1] - p1[1],2) + Math.pow(p2[2] - p1[2],2))
                // archWidthStore.setTypeVal(type,pos,"name",name)
                archWidthStore.setTypeVal(type,pos,"value",val)
                this.#getInstance("InfoSide").setArchWidthData(kMapInfo[pos] + (type=="up"?"Upper":"Lower"),val)
                addToothWidthLabels(type,pos,name,p1,p2)
            }else{
                addToothWidthLabels(type,pos,name,p1)
            }
            clickCount = clickCount == 0 ? 1 : 0
        })

        this.#archBox.addEventListener("mouseenter",(e)=>{
            const { x, y } = getMousePosition(e);
            this.#tag.style.top = y + 15 + "px";
            this.#tag.style.left = x + 15 + "px";
            this.#tag.style.opacity = 1
        })

        this.#archBox.addEventListener("mousemove",(e)=>{
            const { x, y } = getMousePosition(e);
            this.#tag.style.top = y + 15 + "px";
            this.#tag.style.left = x + 15 + "px";
        })

        this.#archBox.addEventListener("mouseleave",(e)=>{
            this.#tag.style.opacity = 0
        })
    }
    #getInstance(name) {
        return NewInstances.getInstance(name)
    }
    remove() {
        this.#archBox.remove()
    }
}