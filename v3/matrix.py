# m a t r i x . p y
#
#  Support for 2d matrix that renders to an HTML table
#

class Matrix :
    def __init__ (self, nrows=0, ncols=0, Expand=True) :
        self.nrows = nrows
        self.ncols = ncols
        self.values = {}
        if Expand :
            self.format = Matrix(nrows, ncols, False)
            self.style  = Matrix(nrows, ncols, False)

    def __getitem__(self, coords) :
        row, col = coords
        return self.values.get((row,col))

    def __setitem__(self, coords, value) :
        row, col = coords
        self.values[(row,col)] = value
        self.nrows = max(self.nrows,row+1)
        self.ncols = max(self.ncols,col+1)
        return value

#===========================================

    def setrowEach(self, row, values) :
        col = 0
        for col in range(len(values)) :
            self.__setitem__((row,col),values[col])
            col += 1

    def setrowAll(self, row, value) :
        col = 0
        while col < self.ncols :
            self.__setitem__((row,col),value)
            col += 1

    def getrow (self, row) :
        vals = []
        for c in range(self.ncols) :
            vals.append(self.__getitem__( (row,c) ))
        return vals

#===========================================
#   setcol... functions here
#===========================================

    def renderHtml(self, tableStyle="", headers=None,
                   cellStyle="", cellFormat="") :
        lins = ["<table %s>" % tableStyle]
        if headers :
            lins.append("<tr><th>"+"</th><th>".join(map(str,headers))+
                        "</th></tr>")
        for row in range(self.nrows) :
            rowLin = ["  <tr>"]
            vals = self.getrow(row)
            if self.format : formats = self.format.getrow(row)
            else           : formats = ['']*self.ncols
            if self.style  : styles  = self.style.getrow(row)
            else           : styles  = ['']*self.ncols
            for c in range(self.ncols) :
                val = vals[c]; style=styles[c]; format=formats[c]
                if val == None : val = ""
                if not format : format = cellFormat
                if format : val = format % val
                if not style : style = cellStyle
                if style : cell = '<td style="%s">%s</td>' % (style,val)
                else     : cell = '<td>%s</td>' % val
                rowLin.append(cell)
            rowLin.append("</tr>")
            lins.append("".join(rowLin))
        lins.append("</table>")
        return "\n".join(lins)

    def __str__ (self) :
        return "Matrix-%dx%d" % (self.nrows,self.ncols)

class Stack (Matrix) :
    def __init__(self, depth) :
        Matrix.__init__(self,depth,1)
        self.tos = -1
        print self.__dict__
        
    def push(self, value) :
        self.tos += 1
        self[tos,0] = value
        
    def pop(self) :
        if self.tos < 0 : return None
        else :
            value = self[self.tos,0]
            self[self.tos,0] = None
            self.tos -= 1
            return value

