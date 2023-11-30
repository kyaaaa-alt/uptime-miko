# login

:local min_delay 5;
:local max_delay 10;
:local random_delay [:rand $min_delay $max_delay];
:delay $random_delay;

:local pppuser "$user";
:local pppip [/ppp active get [find name=$pppuser] address];
:local pppservice [/ppp active get [find name=$pppuser] service];
:local clientphone "-";
:local pppcallerid [/ppp active get [find name=$pppuser] caller-id];
:local ppplastlogout [/ppp secret get [find name=$pppuser] last-logged-out];
:local ppplastdisconnectreason [/ppp secret get [find name=$pppuser] last-disconnect-reason];
:local ppplastpppcallerid [/ppp secret get [find name=$pppuser] last-caller-id];
:local clientaddress "-";

:log warning "pppoe $pppuser is login in and reported to uptime miko";

:local url "https://miko.sultankhilove.biz.id/api/updateUserData";
/tool fetch url=$url mode=http http-method=post http-data=("user=" . $pppuser . "&ip=" . $pppip . "&service=" . $pppservice . "&phone=" . $clientphone . "&callerid=" . $pppcallerid . "&lastlogout=" . $ppplastlogout . "&lastdisconnectreason=" . $ppplastdisconnectreason . "&lastpppcallerid=" . $ppplastpppcallerid . "&address=" . $clientaddress) http-header="Content-Type: application/x-www-form-urlencoded" keep-result=no;


  # logout
:local min_delay 1;
:local max_delay 4;
:local random_delay [:rand $min_delay $max_delay];
:delay $random_delay;

:local pppuser "$user";
:local pppip "-";
:local pppservice [/ppp secret get [find name=$pppuser] service];
:local clientphone "-";
:local pppcallerid "-";
:local ppplastlogout [/ppp secret get [find name=$pppuser] last-logged-out];
:local ppplastdisconnectreason [/ppp secret get [find name=$pppuser] last-disconnect-reason];
:local ppplastpppcallerid [/ppp secret get [find name=$pppuser] last-caller-id];
:local clientaddress "-";

:log warning "pppoe $pppuser is logout and reported to uptime miko";

:local url "https://miko.sultankhilove.biz.id/api/updateUserData";
/tool fetch url=$url mode=http http-method=post http-data=("user=" . $pppuser . "&ip=" . $pppip . "&service=" . $pppservice . "&phone=" . $clientphone . "&callerid=" . $pppcallerid . "&lastlogout=" . $ppplastlogout . "&lastdisconnectreason=" . $ppplastdisconnectreason . "&lastpppcallerid=" . $ppplastpppcallerid . "&address=" . $clientaddress) http-header="Content-Type: application/x-www-form-urlencoded" keep-result=no;


