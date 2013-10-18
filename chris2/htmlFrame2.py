#  h t m l F r a m e 2 . p y
#
#  Chris Meyers. 10/17/2013
#
# Holder for attributes to be applied to a template and
# a simple function to apply attributes to template and
# send it to the <div> for display


outHead = """
var %sTrace = {
  "code": "# No code given",
  "trace": [
"""

outTrace1 = """ 
    {
      "ordered_globals": [], 
      "html_output": '%s',
      "stdout": "", 
      "func_name": "<module>", 
      "stack_to_render": [], 
      "globals": {}, 
      "heap": {},
      "line": 1, 
"""

outTrace2 = """ 
      "event": "step_line"
    }, 
"""

outTail = """ 
      "event": "return"
    }
  ]
}
"""

class HtmlTrace() :
    def __init__(self, name) :
        self.name = name
        self.nFrames = 0
        self.lines = [outHead % name]
        
    def makeFrame (self, html) :
        html = re.sub("\n","\\\n",html) ### temp till better
        #html = re.sub("\n"," ",html) ### temp till better
        if self.nFrames : self.lines.append(outTrace2)
        self.lines.append(outTrace1 % html)
        self.nFrames += 1
        
    def close (self) :
        if self.nFrames : self.lines.append(outTail)
        return "".join(self.lines)
        
#===== HtmlFrame User Connection ===== 
import re, sys

dft_template = """
<html><body>
<h3>%(banner)s</h3>
<div>%(item1)s</div>
<div>%(item2)s</div>
<div>%(item3)s</div>
</html></body>
"""

class HtmlFrame :
    def __init__ (self, template=dft_template, banner="", 
                        wrapper="wrapper", name="test") :
        self.name     = name
        self.trace    = HtmlTrace(name)
        self.template = template
        self.wrapper  = wrapper
        self.banner   = banner
        self.item1 = self.item2 = self.item3 = ""

    def makeFrame (self,template=None) :
        if not template : template = self.template
        content = template % self.__dict__
        self.trace.makeFrame(content)

    def embedFrames(self, wrapper=None) :
        json = self.trace.close()
        if not wrapper : return json
        name = self.name

        js = re.sub("xxx", name, open("%s.js" % wrapper).read())
        js = re.sub("%sJsonTrace"%name, json, js)
        
        html = re.sub("xxx", name, open("%s.html" % wrapper).read())
        html = re.sub("%sJavascript"%name, js, html)
        
        #html = expandIncludes(html)
        return html

def expandIncludes(html) :
    lines = html.split('\n')
    for i in range(len(lines)) :
        line = lines[i]
        words = line.split()
        if words and words[0] == "#include" :
            tag  = words[1]
            file = words[2]
            cont = open(file).read()
            lines[i] = "<%s>\n%s\n</%s>" % (tag,cont,tag)
    return "\n".join(lines)

