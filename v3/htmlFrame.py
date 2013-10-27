#  h t m l F r a m e . p y
#
#  Chris Meyers. 10/21/2013
#   Modified to work for both online and stand-alone versions
#
# Holder for attributes to be applied to a template and
# a simple function to apply attributes to template and
# send it to the <div> for display

import re

dft_template = """
<html><body>
<h3>%(banner)s</h3>
<div>%(item1)s</div>
<div>%(item2)s</div>
<div>%(item3)s</div>
</html></body>
"""

standAlone = False
instance   = None

def HtmlFrame (template=dft_template, banner="") :
    global instance, standAlone
    if instance   : return instance  # singleton
    else :
        if standAlone : instance = HtmlFrame2 (template, banner)
        else          : instance = HtmlFrame1 (template, banner)
        return instance
   
#==================================================
#
#   Online OPT section
#
class HtmlFrame1 :
    def __init__ (self, template=dft_template, banner="") :
        self._template = template
        self.banner   = banner
        self.item1 = self.item2 = self.item3 = ""

    def makeEofPage(self) :
        pass
            
    def makeFrame (self,template=None) :
        from pg_logger import setHTML
        if not template : template = self._template
        content = template % self.__dict__
        setHTML(content)

#==================================================
#
#   Stand alone section
#
simName    = "test"       # Name to pass to browser
simWrapper = "dTemplate"  # wrap-around js and html

#  Stand-Alone class and helpers

class HtmlFrame2 :
    def __init__ (self, template, banner) :
        self._name     = simName
        self._trace    = HtmlTrace(simName)
        self._template = template
        self.banner   = banner
        self.item1 = self.item2 = self.item3 = ""

    def makeFrame (self,template=None) :
        if not template : template = self._template
        content = template % self.__dict__
        self._trace.makeFrame(content)

    def embedFrames(self, exePath="./", wrapper=simWrapper) :
        json = self._trace.close()
        if not wrapper : return json
        name = self._name

        js = re.sub("xxx", name, open("%s/%s.js" % (exePath,wrapper)).read())
        js = re.sub("%sJsonTrace"%name, json, js)
        
        html = re.sub("xxx", name, open("%s/%s.html" % (exePath,wrapper)).read())
        html = re.sub("%sJavascript"%name, js, html)
        
        html = expandIncludes(exePath, html)
        return html

def expandIncludes(exePath, html) :
    lines = html.split('\n')
    for i in range(len(lines)) :
        line = lines[i]
        words = line.split()
        if words and words[0] == "#include" :
            tag = words[1]
            fil = words[2]
            cont = open("%s/%s" % (exePath,fil)).read()
            lines[i] = "<%s>\n%s\n</%s>" % (tag,cont,tag)
    return "\n".join(lines)

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
        html = re.sub("\n","\\\n",html) # cont lines for json 
        if self.nFrames : self.lines.append(outTrace2)
        self.lines.append(outTrace1 % html)
        self.nFrames += 1
        
    def close (self) :
        if self.nFrames : self.lines.append(outTail)
        return "".join(self.lines)
        
