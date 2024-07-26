import { Root, Item, Header, Trigger, Content } from "@radix-ui/react-accordion"
import { ChevronDownIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"

const Accordion = Root

const AccordionItem = forwardRef(({ className, ...props }, ref) => (
    <Item ref={ref} className={cn("border-b", className)} {...props}  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = forwardRef(({ className, children, ...props }, ref) => (
    <Header className="flex">
        <Trigger
            ref={ref} {...props}
            className={cn(
                "flex flex-1 items-center justify-between py-4 text-base text-[#030404] font-bold transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
                className,
            )}
        >
            {children}
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
        </Trigger>
    </Header>
))
AccordionTrigger.displayName = Trigger.displayName

const AccordionContent = forwardRef(({ className, children, ...props }, ref) => (
    <Content
        ref={ref} {...props}
        className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    >
        <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </Content>
))
AccordionContent.displayName = Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
