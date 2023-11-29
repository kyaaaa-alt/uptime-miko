# login
:delay 5s;
:local pppuser "$user";
:local pppip [/ppp active get [find name=$pppuser] address];
:local pppservice [/ppp active get [find name=$pppuser] service];
:local clientphone "-";
:local pppcallerid [/ppp active get [find name=$pppuser] caller-id];
:local ppplastlogout [/ppp secret get [find name=$pppuser] last-logged-out];
:local ppplastdisconnectreason [/ppp secret get [find name=$pppuser] last-disconnect-reason];
:local ppplastpppcallerid [/ppp secret get [find name=$pppuser] last-caller-id];
:local clientaddress "-";

:log warning "pppoe on logout triggered";

:local url "https://miko.sultankhilove.biz.id/api/updateUserData";
/tool fetch url=$url mode=http http-method=post http-data=("user=" . $pppuser . "&ip=" . $pppip . "&service=" . $pppservice . "&phone=" . $clientphone . "&callerid=" . $pppcallerid . "&lastlogout=" . $ppplastlogout . "&lastdisconnectreason=" . $ppplastdisconnectreason . "&lastpppcallerid=" . $ppplastpppcallerid . "&address=" . $clientaddress) http-header="Content-Type: application/x-www-form-urlencoded" keep-result=no;
:delay 5s;

:local nama "$user";
:local bot "6607464345:AAEANBIR9Eg9TNNP_9b3celbSJvxDtpivQo";
:local chat "411921090";
:local ips [/ppp active get [find name=$nama] address];
:local up [/ppp active get [find name=$nama] uptime];
:local caller [/ppp active get [find name=$nama] caller-id];
:local service [/ppp active get [find name=$nama] service];
:local active [/ppp active print count];
:local lastdisc [/ppp secret get [find name=$user] last-disconnect-reason];
:local lastlogout [/ppp secret get [find name=$user] last-logged-out];
:local lastcall [/ppp secret get [find name=$user] last-caller-id];
:local coment [/ppp secret get [find name=$user] comment];
  
  
  # logout
:delay 5s;
:local pppuser "$user";
:local pppip "-";
:local pppservice [/ppp secret get [find name=$pppuser] service];
:local clientphone "-";
:local pppcallerid "-";
:local ppplastlogout [/ppp secret get [find name=$pppuser] last-logged-out];
:local ppplastdisconnectreason [/ppp secret get [find name=$pppuser] last-disconnect-reason];
:local ppplastpppcallerid [/ppp secret get [find name=$pppuser] last-caller-id];
:local clientaddress "-";

:log warning "pppoe on logout triggered";

:local url "https://miko.sultankhilove.biz.id/api/updateUserData";
/tool fetch url=$url mode=http http-method=post http-data=("user=" . $pppuser . "&ip=" . $pppip . "&service=" . $pppservice . "&phone=" . $clientphone . "&callerid=" . $pppcallerid . "&lastlogout=" . $ppplastlogout . "&lastdisconnectreason=" . $ppplastdisconnectreason . "&lastpppcallerid=" . $ppplastpppcallerid . "&address=" . $clientaddress) http-header="Content-Type: application/x-www-form-urlencoded" keep-result=no;
:delay 5s;


:local bot "6607464345:AAEANBIR9Eg9TNNP_9b3celbSJvxDtpivQo";
:local chat "411921090";
:local lastdisc [/ppp secret get [find name=$user] last-disconnect-reason];
:local lastlogout [/ppp secret get [find name=$user] last-logged-out];
:local lastcall [/ppp secret get [find name=$user] last-caller-id];
:local coment [/ppp secret get [find name=$user] comment];
:local active [/ppp active print count];
:local datetime "\F0\9D\90\93\F0\9D\90\9A\F0\9D\90\A7\F0\9D\90\A0\F0\9D\90\A0\F0\9D\90\9A\F0\9D\90\A5\3A $[/system clock get date] %0A\F0\9D\90\89\F0\9D\90\9A\F0\9D\90\A6\3A $[/system clock get time]";
/tool fetch url="https://api.telegram.org/bot$bot/sendmessage\?chat_id=$chat&text=\E2\9D\8CPPPOE-LOGOUT %0A$datetime%0A\F0\9D\90\94\F0\9D\90\AC\F0\9D\90\9E\F0\9D\90\AB\3A $user %0A\F0\9D\90\8B\F0\9D\90\9A\F0\9D\90\AC\F0\9D\90\AD\20\F0\9D\90\83\F0\9D\90\A2\F0\9D\90\AC\F0\9D\90\9C\F0\9D\90\A8\F0\9D\90\A7\F0\9D\90\A7\F0\9D\90\9E\F0\9D\90\9C\F0\9D\90\AD\20\F0\9D\90\91\F0\9D\90\9E\F0\9D\90\9A\F0\9D\90\AC\F0\9D\90\A8\F0\9D\90\A7\3A $lastdisc %0A\F0\9D\90\8B\F0\9D\90\9A\F0\9D\90\AC\F0\9D\90\AD\20\F0\9D\90\8B\F0\9D\90\A8\F0\9D\90\A0\F0\9D\90\A8\F0\9D\90\AE\F0\9D\90\AD\3A $lastlogout %0A\F0\9D\90\8B\F0\9D\90\9A\F0\9D\90\AC\F0\9D\90\AD\20\F0\9D\90\82\F0\9D\90\9A\F0\9D\90\A5\F0\9D\90\A5\F0\9D\90\9E\F0\9D\90\AB\20\F0\9D\90\88\F0\9D\90\83\3A $lastcall %0A\F0\9D\90\93\F0\9D\90\A8\F0\9D\90\AD\F0\9D\90\9A\F0\9D\90\A5\20\F0\9D\90\9A\F0\9D\90\9C\F0\9D\90\AD\F0\9D\90\A2\F0\9D\90\AF\F0\9D\90\9E\3A $active Client %0A\F0\9F\94\94\F0\9D\90\8C\F0\9D\90\8E\F0\9D\90\91\F0\9D\90\84\20\F0\9D\90\88\F0\9D\90\8D\F0\9D\90\85\F0\9D\90\8E\F0\9D\90\91\F0\9D\90\8C\F0\9D\90\80\F0\9D\90\93\F0\9D\90\88\F0\9D\90\8E\F0\9D\90\8D\F0\9F\94\94 %0A$coment " mode=http keep-result=no;

