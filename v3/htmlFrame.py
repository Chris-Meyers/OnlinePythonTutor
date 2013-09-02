#  h t m l F r a m e . p y
#
# Holder for attributes to be applied to a template and
# a simple function to apply attributes to template and
# send it to the <div> for display

from pg_logger import setHTML

class HtmlFrame :
    def __init__ (self, template="") :
        self.defaultTemplate = template

    def makeFrame (self,template=None) :
        if not template : template = self.defaultTemplate
        content = template % self.__dict__
        setHTML(content)

