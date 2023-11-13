divideString = function(str,limit)
	offset = 0
	maxLen = str.len
	frags = []

	while offset < maxLen
		next = offset + limit
		frags.push(str[offset:next])
		offset = next
	end while

	return frags
end function

print(divideString("blahhblahhblahhblahhblahhblahhgad",5))

test.current_path = "/home/"+test.moo[-1].user[test.bar[-1].foo.indexOf("@")+1:]

for i in range(0,s.len-4)
	if f.hasIndex(s[i:i+3]) then f[s[i:i+3]][s.len]=1 else f[s[i:i+3]]={s.len:1}
end for

foo[1:]
foo[:1]
foo[foo[1:]:]
foo[:foo[:1]]
foo[foo[1:]:foo[:1]]