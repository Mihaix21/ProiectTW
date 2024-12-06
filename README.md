# Aplicație web pentru gestionarea rezolvării bug-urilor

## Obiectiv
Realizarea unei aplicații web care să permită gestionarea bug-urilor într-o aplicație.

## Descriere
Aplicația trebuie să permită comunicarea dintre membri unei echipe a bug-urilor dintr-o aplicație

Platforma este bazată pe o aplicație web cu arhitectură de tip Single Page Application accesibilă în browser de pe desktop, dispozitive mobile sau tablete (considerând preferințele utilizatorului).

## Funcționalități (minime)

Ca student trebuie să pot sa ma conectez la aplicație cu un cont bazat pe o adresă de email.

Ca student membru în echipa unui proiect (MP) pot să înregistrez un proiect software pentru a fi monitorizat prin aplicație, specificând repository-ul proiectului și echipa de proiect.

Ca student care nu face parte dintr-un proiect înregistrat pot să mă adaug ca tester (TST) la proiect.

Ca TST pot înregistra un bug în aplicație. Bug-ul conține o severitate, o prioritate de rezolvare, o descriere și un link la commit-ul la care se referă.

Ca MP pot vedea bug-urile înregistrate pentru proiectele din care fac parte.

Ca MP îmi pot aloca rezolvarea unui bug. Un singur MP poate să aibă alocată rezolvarea unui bug la un moment dat.

Ca MP după rezolvarea unui bug pot adăuga un status al rezolvării cu un link la commit-ul prin care s-a rezolvat.
Aplicația are și un sistem de permisiuni. Un MP poate adăuga și modifica un proiect, poate actualiza status-ul unui bug. Un TST poate adăuga un bug.
