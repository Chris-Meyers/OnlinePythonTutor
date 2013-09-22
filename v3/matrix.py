# m a t r i x . p y
#
#  Support for 2d matrix that renders to an HTML table
#

class Matrix :
    def __init__ (self, nrows=0, ncols=0,
                  dftFormat="", dftStyle="", title="",
                  tableAttr="", tableHeaders=None,
                  Expand=True) :
        self.nrows = nrows
        self.ncols = ncols
        self.values = {}
        if Expand :
            # get attributes only on the main Matrix
            self.dftFormat    = dftFormat
            self.dftStyle     = dftStyle
            self.title        = title
            self.tableAttr    = tableAttr
            self.tableHeaders = tableHeaders
            self.format = Matrix(nrows, ncols, Expand=False)
            self.style  = Matrix(nrows, ncols, Expand=False)

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

    def renderHtml(self) :
        lins = ["","<table %s>" % self.tableAttr]
        if self.title : lins[0] = "<div>%s</div>" % self.title
        headers = self.tableHeaders
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
                if not format : format = self.dftFormat
                if format :
                    if type(format)==type("") : val = format % val
                    else                      : val = format(val)
                if not style : style = self.dftStyle
                if style : cell = '<td style="%s">%s</td>' % (style,val)
                else     : cell = '<td>%s</td>' % val
                rowLin.append(cell)
            rowLin.append("</tr>")
            lins.append("".join(rowLin))
        lins.append("</table>")
        return "\n".join(lins)

    def __str__ (self) :
        return "Matrix-%dx%d" % (self.nrows,self.ncols)

typeSeq = (type([]), type((1,2)))

def dictToLol(dic, keys=None) :
    "Convert dict to a list of lists"
    if not keys :
        keys = dic.keys(); keys.sort()
    lists = []
    for key in keys :
        val = dic[key]
        if type(val) not in typeSeq : val = [val]
        lists.append([key]+list(val))
    return lists

def lolMatrix(lists) :
    "Make matrix from a list of lists"
    nRows = len(lists)
    nCols = max([len(l) for l in lists])
    mat = Matrix(nRows,nCols)
    for row in range(len(lists)) :
        vals = lists[row]
        if type(vals) != list : vals = [vals] # make sing col
        mat.setrowEach(row, vals)
        mat.style[row,0]="background-color:lightgreen"
    return mat

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
