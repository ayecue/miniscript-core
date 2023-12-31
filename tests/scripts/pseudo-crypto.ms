String = {}

String.constructor = function(str)
	self.str = str
	return self
end function

String.parse = function(values)
	result = self.str
	index = 0
	maxIndex = values.len

	while index < maxIndex
		result = result.replace("$"+index, values[index])
		index = index + 1
	end while

	return (new self).constructor(result)
end function

String.startsWith = function(str)
	return self.str.indexOf(str) == 0
end function

String.substr = function(startIndex, endIndex)
	return (new self).constructor(slice(self.str, startIndex, endIndex))
end function

String.indexOf = function(str)
	return self.str.indexOf(str)
end function

String.replace = function(str, newStr)
	return (new self).constructor(self.str.replace(str, newStr))
end function

String.remove = function(str)
	return (new self).constructor(self.str.remove(str))
end function

String.toString = function()
	return self.str
end function

String.length = function()
	return self.str.len
end function

String.split = function(seperator)
	return self.str.split(seperator)
end function

String.trim = function(seperator)
	return (new self).constructor(self.str.trim())
end function

Error = {}

Error.String = String

Error.constructor = function(message, values)
	m = self
	m.message = message
	if (values != null) then
		m.message = (new m.String).constructor(message).parse(values).toString()
	end if
	return m
end function

Error.throw = function()
	exit("<color=#ff0000>" + self.message + "</color>")
end function

Crypto = {}

Crypto.defaultCharset = "QWERTZUIOPASDFGHJKLYXCVBNMqwertzuiopasdfghjklyxcvbnm1234567890+-"
Crypto.defaultSecret = "test123"
Crypto.maxCharCode = 55295
Crypto.Error = Error

Crypto.constructor = function(defaultSecret, hashFn, charset)
	me = self
	me.defaultSecret = defaultSecret
	me.table = charset
	me.hashFn = @hashFn
	if (@hashFn == null) then me.hashFn = @md5
	if charset == null then me.table = me.defaultCharset
	if me.table.len != 64 then (new me.Error).constructor("Invalid charset $0...", [me.table]).throw()
	return me
end function

Crypto.getHash = function(pw)
	me = self
	hash = []
	x = me.hashFn(pw)
	for char in x
		hash.push(char.code)
	end for
	hash.reverse
	return hash
end function

Crypto.encrypt = function(str, pw)
	me = self
	if (pw == null) then pw = me.defaultSecret
	hash = me.getHash(pw)
	hashPointer = 0
	output = []
	position = 0
	padding = str.len % 3
	max = str.len - padding
	get = function(v)
		if (not me.table.hasIndex(v)) then
			(new me.Error).constructor("Invalid index $0...", [v]).throw()
		end if
		return me.table[v]
	end function
	AND = function(a, b)
		return bitwise("&", a, b)
	end function
	LSHIFT = function(a, b)
		return bitwise("<<", a, b)
	end function
	RSHIFT = function(a, b)
		return bitwise(">>", a, b)
	end function
	while position < max
		m = hash[position % hash.len - 1]
		a = LSHIFT(str[position].code + m, 16)
		b = LSHIFT(str[position + 1].code + m, 8)
		c = str[position + 2].code + m
		buffer = a + b + c
		output.push(get(AND(RSHIFT(buffer, 18), 63)))
		output.push(get(AND(RSHIFT(buffer, 12), 63)))
		output.push(get(AND(RSHIFT(buffer, 6), 63)))
		output.push(get(AND(buffer, 63)))
		position = position + 3
	end while
	if (padding == 2) then
		m = hash[position % hash.len - 1]
		a = LSHIFT(str[position].code + m, 8)
		b = str[position + 1].code + m
		buffer = a + b
		output.push(get(RSHIFT(buffer, 10)))
		output.push(get(AND(RSHIFT(buffer, 4), 63)))
		output.push(get(AND(LSHIFT(buffer, 2), 63)))
		output.push("=")
	else if (padding == 1) then
		m = hash[position % hash.len - 1]
		buffer = str[position].code + m
		output.push(get(RSHIFT(buffer, 2)))
		output.push(get(AND(LSHIFT(buffer, 4), 63)))
		output.push("==")
	end if
	return output.join("")
end function

Crypto.decrypt = function(str, pw)
	me = self
	if (pw == null) then pw = me.defaultSecret
	hash = me.getHash(pw)
	hashPointer = 0
	hashLength = hash.len
	output = []
	bitCounter = 0
	bitStorage = 0
	position = 0
	hashPointer = 0
	max = str.len
	AND = function(a, b)
		return bitwise("&", a, b)
	end function
	RSHIFT = function(a, b)
		return bitwise(">>", a, b)
	end function
	while position < max
		buffer = me.table.indexOf(str[position])
		currentBit = bitCounter
		bitCounter = bitCounter + 1
		if (currentBit % 4) then
			bitStorage = bitStorage * 64 + buffer
		else
			bitStorage = buffer
		end if
		if (currentBit % 4) then
			expectedHashIndex = (floor(hashPointer / 3) * 3) % hashLength - 1
			if (not hash.hasIndex(expectedHashIndex)) then break
			m = hash[expectedHashIndex]
			operation = AND(-2 * bitCounter, 6)
			operation = RSHIFT(bitStorage, operation)
			operation = AND(255, operation)
			if (operation != 0) then
				charCode = operation - m
				if (charCode > me.maxCharCode) then break
				output.push(char(charCode))
			end if
			hashPointer = hashPointer + 1
		end if
		position = position + 1
	end while
	return output.join("")
end function

test = (new Crypto).constructor("test")

pwd = "abcde"

foo = test.encrypt(pwd)
decrypted = test.decrypt(foo)

print(foo)
print(decrypted)
