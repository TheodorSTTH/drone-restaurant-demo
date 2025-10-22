import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
  
export default function AddOrderMockData() {
    async function addOrderMockData() {
        //
    }
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline">Add order mock data</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Add order mock data</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will add mock data to the database. This is not a production feature.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogContent>

                </AlertDialogContent>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Add</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
  